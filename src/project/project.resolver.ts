import { Args, Mutation, Query, Resolver, Subscription } from '@nestjs/graphql';
import { ProjectService } from './project.service';
import { Project } from 'src/schemas/project.schema';
import { CreateProjectInput } from './dto/createProjectInput';
import { HttpStatus, Inject, UseGuards, UseInterceptors } from '@nestjs/common';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { CurrentUser } from 'src/common/decorators/user.decorator';
import { User as AuthUser } from 'src/types/user';
import { GraphQLError } from 'graphql';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UserRole } from 'src/schemas/user.schema';
import { GraphQLErrorInterceptor } from 'src/common/interceptors/graphql-error.interceptor';
import { PUB_SUB } from 'src/modules/pubSub.module';
import { RedisPubSub } from 'graphql-redis-subscriptions';
const CREATE_COMPANY_PROJECT = 'createCompanyProject';
@Resolver('Project')
@UseInterceptors(GraphQLErrorInterceptor)
export class ProjectResolver {
  constructor(
    private readonly projectService: ProjectService,
    @Inject(PUB_SUB) private readonly pubSub: RedisPubSub,
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
    @CurrentUser() user: AuthUser,
  ): Promise<Project[]> {
    if (!user) {
      this.handleError('user not found', HttpStatus.NOT_FOUND);
    }
    return this.projectService.getAllProjectsByCompany(user._id);
  }
  @UseGuards(AuthGuard)
  @Subscription(() => Project, {
    filter: async function (payload, variables, context) {
      const { req, res } = context;
      if (!req?.user) {
        this.handleError('user not found', HttpStatus.NOT_FOUND);
      }
      console.log(payload);
      console.log(payload.createCompanyProject);

      return payload.createCompanyProject.company == variables.companyId;
    },
  })
  createCompanyProject(@Args('companyId') userId: string) {
    return this.pubSub.asyncIterator(CREATE_COMPANY_PROJECT);
  }
}
