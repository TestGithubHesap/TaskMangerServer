import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Company, CompanyDocument } from 'src/schemas/company.schema';
import { CreateCompanyInput } from './dto/createCompany.nput';
import {
  CompanyJoinRequest,
  CompanyJoinRequestDocument,
  JoinRequestStatus,
} from 'src/schemas/companyJoinRequest.schema';
import { GraphQLError } from 'graphql';
import { User, UserDocument, UserRole } from 'src/schemas/user.schema';

@Injectable()
export class CompanyService {
  constructor(
    @InjectModel(Company.name) private companyModel: Model<CompanyDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(CompanyJoinRequest.name)
    private companyJoinRequestModel: Model<CompanyJoinRequestDocument>,
  ) {}
  private handleError(
    message: string,
    statusCode: HttpStatus,
    error?: any,
  ): never {
    throw new GraphQLError(message, {
      extensions: {
        code: statusCode,
        error,
      },
    });
  }
  async getCompany(companyId: string): Promise<Company> {
    return this.companyModel.findById(companyId);
  }
  async getCompanyByUser(
    userId: string,
    companyId: string | null,
  ): Promise<{
    company: Company;
    isCompanyEmploye: boolean;
    showCompanyjoinButton: boolean;
    isJoinRequest?: boolean;
  }> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      this.handleError('User not found', HttpStatus.NOT_FOUND);
    }

    if (companyId) {
      const company = await this.companyModel.findById(companyId);

      if (!company) {
        this.handleError('Company not found', HttpStatus.NOT_FOUND);
      }
      const companyJoinReques = await this.companyJoinRequestModel.findOne({
        company: companyId,
        user: userId,
        status: JoinRequestStatus.PENDING,
      });
      return {
        company,
        isCompanyEmploye: user.company == company._id,
        showCompanyjoinButton: !user.company,
        isJoinRequest: !!companyJoinReques,
      };
    }

    const company = await this.companyModel.findById(user.company);
    if (!company) {
      this.handleError('Company not found', HttpStatus.NOT_FOUND);
    }
    return {
      company,
      isCompanyEmploye: user.company == company._id,
      showCompanyjoinButton: false,
      isJoinRequest: false,
    };
  }

  async cancelJoinCompanyRequest(userId: string, companyId: string) {
    const companyJoinRequest = await this.companyJoinRequestModel.findOne({
      company: companyId,
      user: userId,
      status: JoinRequestStatus.PENDING,
    });
    if (!companyJoinRequest) {
      this.handleError('request is not found', HttpStatus.NOT_FOUND);
    }
    companyJoinRequest.status = JoinRequestStatus.CANCELED;
    return await companyJoinRequest.save();
  }

  async createCompany(input: CreateCompanyInput) {
    const company = new this.companyModel(input);
    return await company.save();
  }
  async requestToJoinCompany(
    userId: string,
    companyId: string,
  ): Promise<CompanyJoinRequest> {
    const existingRequest = await this.companyJoinRequestModel.findOne({
      user: userId,
      company: companyId,
      status: JoinRequestStatus.PENDING,
    });
    if (existingRequest) {
      this.handleError(
        'You have already requested to join this company.',
        HttpStatus.BAD_REQUEST,
      );
    }

    const joinRequest = new this.companyJoinRequestModel({
      user: userId,
      company: companyId,
      status: JoinRequestStatus.PENDING,
    });

    return joinRequest.save();
  }

  async respondToJoinRequest(
    requestId: string,
    approverUserId: string,
    approve: boolean,
  ): Promise<CompanyJoinRequest> {
    const joinRequest = await this.companyJoinRequestModel
      .findById(requestId)
      .populate({
        path: 'user',
        select: '_id roles',
      });
    if (!joinRequest) {
      this.handleError('Join request not found.', HttpStatus.NOT_FOUND);
    }

    // Onaylayan kişinin bilgilerini alın
    const [approverUser, requestingUser] = await Promise.all([
      this.userModel.findById(approverUserId),
      this.userModel.findById(joinRequest.user._id.toString()),
    ]);
    // const approverUser = await this.userModel.findById(approverUserId);
    if (!approverUser || !requestingUser) {
      this.handleError(
        'Approver user or Requesting user  not found. ',
        HttpStatus.NOT_FOUND,
      );
    }

    // Onaylayan kişi admin veya zaten yönetici olmalı
    const isAdminOrManager =
      approverUser.roles.includes(UserRole.ADMIN) ||
      approverUser.isCompanyAdmin;
    if (!isAdminOrManager) {
      this.handleError(
        'User is not authorized to approve the request.',
        HttpStatus.FORBIDDEN,
      );
    }

    joinRequest.status = approve
      ? JoinRequestStatus.APPROVED
      : JoinRequestStatus.REJECTED;
    await joinRequest.save();

    if (approve) {
      const updatedRoles = Array.from(
        new Set([...requestingUser.roles, UserRole.WORKER]),
      );

      await this.userModel.findByIdAndUpdate(joinRequest.user._id, {
        company: joinRequest.company,
        isCompanyAdmin: joinRequest.user.roles.includes(UserRole.EXECUTIVE),
        roles: updatedRoles, // Güncellenmiş roller
      });
    }

    return joinRequest;
  }

  async getCompanyJoinRequests(
    companyId: string | null,
    status: JoinRequestStatus,
    userId: string,
  ): Promise<CompanyJoinRequest[]> {
    // Find user and validate existence
    const user = await this.userModel.findById(userId);
    if (!user) {
      this.handleError('User not found.', HttpStatus.NOT_FOUND);
    }

    const isAdmin = user.roles.includes(UserRole.ADMIN);
    const isExecutive = user.roles.includes(UserRole.EXECUTIVE);

    // If not admin or executive, throw error
    if (!isAdmin && !isExecutive) {
      this.handleError(
        'User is not authorized to view the requests.',
        HttpStatus.FORBIDDEN,
      );
    }

    // Query configuration based on role
    const queryConfig = {
      status,
      company: isAdmin ? companyId || user.company : user.company,
    };

    const populateConfig = {
      path: 'user',
      select: '_id userName profilePhoto',
    };

    // If executive tries to access other company's requests, throw error
    if (!isAdmin && companyId && companyId !== user.company.toString()) {
      this.handleError(
        'Executives can only view their own company requests',
        HttpStatus.FORBIDDEN,
      );
    }

    return this.companyJoinRequestModel
      .find(queryConfig)
      .populate(populateConfig)
      .lean()
      .exec();
  }

  async getCompanyEmployees(
    companyId: string | null,
    currentUserId: string,
    userRoles: UserRole[],
  ) {
    const user = await this.userModel.findById(currentUserId);
    if (!user) {
      this.handleError('User not found.', HttpStatus.NOT_FOUND);
    }

    // Kullanıcı rolünü kontrol et
    const isAdmin = userRoles.includes(UserRole.ADMIN);
    const isExecutive = userRoles.includes(UserRole.EXECUTIVE);

    // Erişim iznini doğrula
    const targetCompanyId = companyId || user.company?.toString();
    if (
      !isAdmin &&
      (!isExecutive || user.company?.toString() !== targetCompanyId)
    ) {
      this.handleError(
        'You do not have authorization to perform this operation.',
        HttpStatus.UNAUTHORIZED,
      );
    }

    // Belirtilen şirket ID'sine ait kullanıcıları getir
    return await this.userModel
      .find({ company: targetCompanyId })
      .select('_id firstName lastName userName profilePhoto roles');
  }

  async promoteToExecutive(
    companyId: string | null,
    userId: string,
    currentUserId: string,
    userRoles: UserRole[],
  ) {
    const [currentUser, user] = await Promise.all([
      this.userModel.findById(currentUserId),
      this.userModel.findById(userId),
    ]);
    if (!currentUser || !user) {
      this.handleError('User not found.', HttpStatus.NOT_FOUND);
    }

    const isAdmin = currentUser.roles.includes(UserRole.ADMIN);
    // const isExecutive = currentUser.roles.includes(UserRole.EXECUTIVE);
    const targetCompanyId = companyId || currentUser.company?.toString();

    if (!isAdmin && currentUser.company?.toString() !== targetCompanyId) {
      this.handleError(
        'You do not have authorization to perform this operation.',
        HttpStatus.UNAUTHORIZED,
      );
    }

    if (!isAdmin && user.company?.toString() !== targetCompanyId) {
      this.handleError(
        'The specified user does not belong to the given company.',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (!user.roles.includes(UserRole.EXECUTIVE)) {
      user.roles.push(UserRole.EXECUTIVE);
      await user.save();
    }

    return user;
  }

  async demoteFromExecutive(
    companyId: string | null,
    userId: string,
    currentUserId: string,
    userRoles: UserRole[],
  ) {
    const [currentUser, user] = await Promise.all([
      this.userModel.findById(currentUserId),
      this.userModel.findById(userId),
    ]);
    if (!currentUser || !user) {
      this.handleError('User not found.', HttpStatus.NOT_FOUND);
    }

    const isAdmin = currentUser.roles.includes(UserRole.ADMIN);
    // const isExecutive = currentUser.roles.includes(UserRole.EXECUTIVE);
    const targetCompanyId = companyId || currentUser.company?.toString();

    if (!isAdmin && currentUser.company?.toString() !== targetCompanyId) {
      this.handleError(
        'You do not have authorization to perform this operation.',
        HttpStatus.UNAUTHORIZED,
      );
    }

    if (!isAdmin && user.company?.toString() !== targetCompanyId) {
      this.handleError(
        'The specified user does not belong to the given company.',
        HttpStatus.BAD_REQUEST,
      );
    }
    if (!user.roles.includes(UserRole.EXECUTIVE)) {
      return user;
    }

    user.roles = user.roles.filter((role) => role !== UserRole.EXECUTIVE);
    await user.save();

    return user;
  }
}
