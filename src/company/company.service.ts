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
    const approverUser = await this.userModel.findById(approverUserId);
    if (!approverUser) {
      this.handleError('Approver user not found.', HttpStatus.NOT_FOUND);
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
    // console.log(joinRequest.user.roles.includes(UserRole.EXECUTIVE));

    if (approve) {
      await this.userModel.findByIdAndUpdate(joinRequest.user._id, {
        company: joinRequest.company,
        isCompanyAdmin: joinRequest.user.roles.includes(UserRole.EXECUTIVE),
      });
    }

    return joinRequest;
  }
}
