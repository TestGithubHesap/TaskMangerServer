import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { TaskService } from './task.service';
import { CreateTaskInput } from './dto/createTaskInput';
import { Task } from 'src/schemas/task.schema';
import { HttpStatus, UseGuards, UseInterceptors } from '@nestjs/common';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UserRole } from 'src/schemas/user.schema';
import { CurrentUser } from 'src/common/decorators/user.decorator';
import { User as AuthUser } from 'src/types/user';
import { GraphQLError } from 'graphql';
import { GraphQLErrorInterceptor } from 'src/common/interceptors/graphql-error.interceptor';
import { UpdateTaskHierarchyInput } from './dto/updateTaskHierarchyInput';
import { UpdateTaskStatusInput } from './dto/updateTaskStatusInput';
import { RolesGuard } from 'src/common/guards/role.guard';
import { Project } from 'src/schemas/project.schema';
import { GetAllTasksByProjectObject } from 'src/types/object-types/GetAllTasksByProjectObject';
import { UpdateTaskInput } from './dto/updateTaskInput';
@Resolver('Task')
@UseInterceptors(GraphQLErrorInterceptor)
export class TaskResolver {
  constructor(private readonly taskService: TaskService) {}
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

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.EXECUTIVE)
  @Mutation(() => Task)
  async createTask(
    @Args('input') input: CreateTaskInput,
    @CurrentUser() user: AuthUser,
  ): Promise<Task> {
    if (!user) {
      this.handleError('user not found', HttpStatus.NOT_FOUND);
    }
    return this.taskService.createTask(user._id, input);
  }

  @Mutation(() => Task)
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.EXECUTIVE)
  async updateTaskHierarchy(
    @Args('input') input: UpdateTaskHierarchyInput,
    @CurrentUser() user: AuthUser,
  ): Promise<Task> {
    if (!user) {
      this.handleError('user not found', HttpStatus.NOT_FOUND);
    }
    return this.taskService.updateTaskHierarchy(
      user._id,
      input.taskId,
      input.parentTaskId,
    );
  }
  @Mutation(() => String)
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.EXECUTIVE)
  async removeParentTask(
    @Args('taskId') taskId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<String> {
    if (!user) {
      this.handleError('user not found', HttpStatus.NOT_FOUND);
    }
    return this.taskService.removeParentTask(user._id, taskId);
  }
  @Mutation(() => String)
  @UseGuards(AuthGuard)
  async updateTaskStatus(
    @Args('input') input: UpdateTaskStatusInput,
    @CurrentUser() user: AuthUser,
  ): Promise<String> {
    if (!user) {
      this.handleError('user not found', HttpStatus.NOT_FOUND);
    }
    return this.taskService.updateTaskUpdate(
      user._id,
      input.taskId,
      input.status,
    );
  }

  @Mutation(() => Task)
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.EXECUTIVE)
  async updateTask(
    @Args('input') input: UpdateTaskInput,
    @CurrentUser() user: AuthUser,
  ): Promise<Task> {
    if (!user) {
      this.handleError('user not found', HttpStatus.NOT_FOUND);
    }
    return this.taskService.updateTask(user._id, input);
  }

  @Query(() => Task)
  @UseGuards(AuthGuard)
  async getTask(@Args('taskId') taskId: string): Promise<Task> {
    return this.taskService.findOneTask(taskId);
  }
  @Query(() => GetAllTasksByProjectObject)
  @UseGuards(AuthGuard)
  async getAllTasksByProject(@Args('projectId') projectId: string): Promise<{
    tasks: Task[];
    project: Project;
  }> {
    return this.taskService.getAllTasksByProject(projectId);
  }

  @Query(() => [Task])
  @UseGuards(AuthGuard)
  async getAllMyTasks(@CurrentUser() user: AuthUser): Promise<Task[]> {
    if (!user) {
      this.handleError('user not found', HttpStatus.NOT_FOUND);
    }
    return this.taskService.getAllMyTasks(user._id);
  }
}
