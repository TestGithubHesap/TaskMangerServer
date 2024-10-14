import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { CompanyService } from './company.service';

import { Company } from 'src/schemas/company.schema';
import { CreateCompanyInput } from './dto/createCompany.nput';
import { HttpStatus, UseGuards } from '@nestjs/common';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { RolesGuard } from 'src/common/guards/role.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UserRole } from 'src/schemas/user.schema';
import { CurrentUser } from 'src/common/decorators/user.decorator';
import { User as AuthUser } from '../types/user';
import { GraphQLError } from 'graphql';
import { CompanyJoinRequest } from 'src/schemas/companyJoinRequest.schema';
@Resolver('Company')
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

  @Mutation(() => Company)
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async createCompany(@Args('input') input: CreateCompanyInput) {
    return this.companyService.createCompany(input);
  }

  @Mutation(() => CompanyJoinRequest)
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.EXECUTIVE, UserRole.WORKER)
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
}
