import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { ProjectService } from './project.service';
import { Project } from 'src/schemas/project.schema';
import { CreateProjectInput } from './dto/createProjectInput';
import { HttpStatus, UseGuards } from '@nestjs/common';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { CurrentUser } from 'src/common/decorators/user.decorator';
import { User as AuthUser } from 'src/types/user';
import { GraphQLError } from 'graphql';
@Resolver()
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
}
