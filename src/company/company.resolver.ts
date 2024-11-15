import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { CompanyService } from './company.service';

import { Company } from 'src/schemas/company.schema';
import { CreateCompanyInput } from './dto/createCompany.nput';
import { HttpStatus, UseGuards, UseInterceptors } from '@nestjs/common';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { RolesGuard } from 'src/common/guards/role.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { User, UserRole } from 'src/schemas/user.schema';
import { CurrentUser } from 'src/common/decorators/user.decorator';
import { User as AuthUser } from '../types/user';
import { GraphQLError } from 'graphql';
import {
  CompanyJoinRequest,
  JoinRequestStatus,
} from 'src/schemas/companyJoinRequest.schema';
import { GraphQLErrorInterceptor } from 'src/common/interceptors/graphql-error.interceptor';
import { CompanyWithButton } from './dto/CompanyWithButton';
import { SearchCompaniesInput } from './dto/searchCompaniesInput';
import { SearchCompaniesObject } from 'src/types/object-types/SearchCompaniesObject';
import { CompanyRequest } from 'src/schemas/companyRequest.schema';
import { CreateCompanyRequestInput } from './dto/CreateCompanyRequestInput';
@Resolver('Company')
@UseInterceptors(GraphQLErrorInterceptor)
export class CompanyResolver {
  constructor(private readonly companyService: CompanyService) {}
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
  @Query(() => Company)
  async getCompany(@Args('companyId') companyId: string): Promise<Company> {
    return this.companyService.getCompany(companyId);
  }

  @Query(() => CompanyWithButton)
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.EXECUTIVE, UserRole.WORKER, UserRole.USER)
  async getCompanyByUser(
    @Args('companyId', { nullable: true }) companyId: string | null,
    @CurrentUser() user: AuthUser,
  ): Promise<{
    company: Company;
    isCompanyEmploye: boolean;
    showCompanyjoinButton: boolean;
    isJoinRequest?: boolean;
  }> {
    return this.companyService.getCompanyByUser(user._id, companyId);
  }

  @Mutation(() => Company)
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async createCompany(@Args('input') input: CreateCompanyInput) {
    return this.companyService.createCompany(input);
  }

  @Query(() => [CompanyJoinRequest])
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.EXECUTIVE, UserRole.ADMIN)
  async getCompanyJoinRequests(
    @Args('companyId', { nullable: true }) companyId: string | null,
    @Args('status', { type: () => JoinRequestStatus })
    status: JoinRequestStatus,
    @CurrentUser() user: AuthUser,
  ) {
    return this.companyService.getCompanyJoinRequests(
      companyId,
      status,
      user._id,
    );
  }

  @Mutation(() => CompanyJoinRequest)
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.EXECUTIVE, UserRole.WORKER, UserRole.USER)
  async requestToJoinCompany(
    @Args('companyId') input: string,
    @CurrentUser() user: AuthUser,
  ) {
    if (!user) {
      this.handleError('user not found', HttpStatus.NOT_FOUND);
    }
    return this.companyService.requestToJoinCompany(user._id, input);
  }

  @Mutation(() => CompanyJoinRequest)
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.EXECUTIVE, UserRole.WORKER, UserRole.USER)
  async cancelJoinCompanyRequest(
    @Args('companyId') companyId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.companyService.cancelJoinCompanyRequest(user._id, companyId);
  }

  @Mutation(() => CompanyJoinRequest)
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.EXECUTIVE, UserRole.ADMIN)
  async respondToJoinRequest(
    @Args('requestId') requestId: string,
    @Args('approve') approve: boolean,
    @CurrentUser() user: AuthUser,
  ) {
    if (!user) {
      this.handleError('user not found', HttpStatus.NOT_FOUND);
    }
    return this.companyService.respondToJoinRequest(
      requestId,
      user._id,
      approve,
    );
  }

  @Query(() => [User])
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.EXECUTIVE, UserRole.ADMIN)
  async getCompanyEmployees(
    @Args('companyId', { nullable: true }) companyId: string | null,
    @CurrentUser() user: AuthUser,
  ) {
    return this.companyService.getCompanyEmployees(
      companyId,
      user._id,
      user.roles,
    );
  }

  @Mutation(() => User)
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.EXECUTIVE, UserRole.ADMIN)
  async promoteToExecutive(
    @Args('companyId', { nullable: true }) companyId: string | null,
    @Args('userId') userId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.companyService.promoteToExecutive(
      companyId,
      userId,
      user._id,
      user.roles,
    );
  }

  @Mutation(() => User)
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.EXECUTIVE, UserRole.ADMIN)
  async demoteFromExecutive(
    @Args('companyId', { nullable: true }) companyId: string | null,
    @Args('userId') userId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.companyService.demoteFromExecutive(
      companyId,
      userId,
      user._id,
      user.roles,
    );
  }

  @Query(() => SearchCompaniesObject)
  @UseGuards(AuthGuard)
  async searchCompanies(
    @Args('input') input: SearchCompaniesInput,
    @CurrentUser() user: AuthUser,
  ) {
    return this.companyService.searchCompanies(input, user._id);
  }

  @Mutation(() => User)
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.EXECUTIVE, UserRole.ADMIN)
  async removeEmployee(
    @Args('userId') userId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.companyService.removeEmployee(userId, user._id);
  }

  @Mutation(() => CompanyRequest)
  @UseGuards(AuthGuard)
  async createCompanyRequest(
    @Args('input') input: CreateCompanyRequestInput,
    @CurrentUser() user: AuthUser,
  ) {
    return this.companyService.createCompanyRequest(input, user._id);
  }

  @Mutation(() => CompanyRequest)
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async rejectCompanyRequest(
    @Args('requestId') requestId: string,
    @Args('reason', { nullable: true }) reason: string | null,
  ) {
    return this.companyService.rejectCompanyRequest(requestId, reason);
  }

  @Mutation(() => Company)
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async approveCompanyRequest(@Args('requestId') requestId: string) {
    return this.companyService.approveCompanyRequest(requestId);
  }
}
