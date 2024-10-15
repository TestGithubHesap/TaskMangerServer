import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { ProjectService } from './project.service';
import { Project } from 'src/schemas/project.schema';
import { CreateProjectInput } from './dto/createProjectInput';
import { HttpStatus, UseGuards, UseInterceptors } from '@nestjs/common';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { CurrentUser } from 'src/common/decorators/user.decorator';
import { User as AuthUser } from 'src/types/user';
import { GraphQLError } from 'graphql';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UserRole } from 'src/schemas/user.schema';
import { GraphQLErrorInterceptor } from 'src/common/interceptors/graphql-error.interceptor';
@Resolver('Project')
@UseInterceptors(GraphQLErrorInterceptor)
export class ProjectResolver {
  constructor(private readonly projectService: ProjectService) {}
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
  @UseGuards(AuthGuard)
  @Roles(UserRole.ADMIN, UserRole.EXECUTIVE)
  @Mutation(() => Project)
  async createProject(
    @Args('input') input: CreateProjectInput,
    @CurrentUser() user: AuthUser,
  ): Promise<Project> {
    if (!user) {
      this.handleError('user not found', HttpStatus.NOT_FOUND);
    }
    return this.projectService.createProject(user._id, input);
  }
  @UseGuards(AuthGuard)
  @Roles(UserRole.ADMIN, UserRole.EXECUTIVE)
  @Query(() => [Project])
  async getAllProjectsByCompany(
    @Args('companyId') companyId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<Project[]> {
    if (!user) {
      this.handleError('user not found', HttpStatus.NOT_FOUND);
    }
    return this.projectService.getAllProjectsByCompany(user._id, companyId);
  }
}
