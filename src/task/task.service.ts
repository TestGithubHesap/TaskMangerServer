// task.service.ts
import { Injectable, BadRequestException, HttpStatus } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Task, TaskDocument, TaskStatus } from 'src/schemas/task.schema';
import { CreateTaskInput } from './dto/createTaskInput';
import { GraphQLError } from 'graphql';
import { Project, ProjectDocument } from 'src/schemas/project.schema';

@Injectable()
export class TaskService {
  constructor(
    @InjectModel(Task.name) private taskModel: Model<TaskDocument>,
    @InjectModel(Project.name) private projectModel: Model<ProjectDocument>,
  ) {}

  private parseDateString(dateString: string): Date {
    const [day, month, year] = dateString.split('.');
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  }
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

  async createTask(
    userId: string,
    createTaskDto: CreateTaskInput,
  ): Promise<Task> {
    try {
      const project = await this.projectModel.findById(createTaskDto.projectId);
      if (!project) {
        this.handleError('Project not found', HttpStatus.BAD_REQUEST);
      }

      const createdTask = new this.taskModel({
        ...createTaskDto,
        project: createTaskDto.projectId,
        assignee: createTaskDto.assigneeId,
        dueDate: this.parseDateString(createTaskDto.dueDate),
        createdByUser: userId,
      });

      const savedTask = await createdTask.save();
      const objectIdAssignee = new Types.ObjectId(createTaskDto.assigneeId);
      if (!project.team.includes(objectIdAssignee)) {
        project.team.push(objectIdAssignee);
        await project.save();
      }
      return savedTask;
    } catch (error) {
      this.handleError(
        'Error creating task',
        HttpStatus.INTERNAL_SERVER_ERROR,
        error,
      );
    }
  }

  async updateTaskHierarchy(
    userId: string,
    taskId: string,
    parentTaskId: string,
  ): Promise<Task> {
    try {
      const [task, parentTask] = await Promise.all([
        this.taskModel.findById(taskId),
        this.taskModel.findById(parentTaskId).populate({
          path: 'project',
          select: '_id projectManager',
        }),
      ]);

      if (!task || !parentTask) {
        this.handleError('Task or parent task not found', HttpStatus.NOT_FOUND);
      }

      if (parentTask.project.projectManager.toString() !== userId) {
        this.handleError(
          'Unauthorized: Only the project manager can update the task hierarchy',
          HttpStatus.FORBIDDEN,
        );
      }
      if (task.project.toString() !== parentTask.project._id.toString()) {
        this.handleError(
          'Tasks are in different projects',
          HttpStatus.BAD_REQUEST,
        );
      }

      // Döngüsel bağımlılığı kontrol et
      if (await this.isCircularDependency(taskId, parentTaskId)) {
        this.handleError(
          'Circular dependency detected',
          HttpStatus.BAD_REQUEST,
        );
      }

      // Eğer görevin zaten bir üst görevi varsa, eski üst görevden çıkar
      if (task.parentTask) {
        await this.taskModel.findByIdAndUpdate(task.parentTask, {
          $pull: { subTasks: taskId },
        });
      }

      // Görevi güncelle
      await this.taskModel.findByIdAndUpdate(taskId, {
        $set: { parentTask: parentTaskId },
      });

      // Üst görevi güncelle
      await this.taskModel.findByIdAndUpdate(parentTaskId, {
        $addToSet: { subTasks: taskId },
      });

      // Güncellenmiş görevi döndür
      return await this.taskModel
        .findById(taskId)
        .populate('parentTask subTasks');
    } catch (error) {
      this.handleError(
        'fail updateTaskHierarchy',
        HttpStatus.INTERNAL_SERVER_ERROR,
        error,
      );
    }
  }

  async removeParentTask(userId: string, taskId: string) {
    try {
      const task = await this.taskModel.findById(taskId).populate('parentTask');
      if (!task) {
        this.handleError('Task  not found', HttpStatus.NOT_FOUND);
      }
      const parentTask = await this.taskModel
        .findById(task.parentTask._id)
        .populate({
          path: 'project',
          select: '_id projectManager',
        });
      if (parentTask.project.projectManager.toString() !== userId) {
        this.handleError(
          'Unauthorized: Only the project manager can update the task hierarchy',
          HttpStatus.FORBIDDEN,
        );
      }

      const removetasss = await this.taskModel.findByIdAndUpdate(
        parentTask._id,
        {
          $pull: { subTasks: taskId },
        },
      );
      console.log(taskId, removetasss);
      await this.taskModel.findByIdAndUpdate(taskId, {
        $set: { parentTask: null },
      });
      return 'Success remove parent task';
    } catch (error) {
      this.handleError(
        'fail removeParentTask',
        HttpStatus.INTERNAL_SERVER_ERROR,
        error,
      );
    }
  }

  async updateTaskUpdate(userId: string, taskId: string, status: TaskStatus) {
    try {
      // Görevi bul
      const task = await this.taskModel.findOne({
        _id: taskId,
        assignee: userId,
      });
      if (!task) {
        this.handleError('Task not found', HttpStatus.NOT_FOUND);
      }

      task.status = status;

      task.save();
      return 'Task update success';
    } catch (error) {
      this.handleError(
        'fail updateTaskHierarchy',
        HttpStatus.INTERNAL_SERVER_ERROR,
        error,
      );
    }
  }

  private async isCircularDependency(
    taskId: string,
    newParentId: string,
  ): Promise<boolean> {
    let currentId = newParentId;
    const visited = new Set<string>();

    while (currentId) {
      if (currentId === taskId) return true;
      if (visited.has(currentId)) return true;
      visited.add(currentId);

      const parentTask = await this.taskModel.findById(currentId);
      currentId = parentTask?.parentTask?.toString();
    }

    return false;
  }

  async findAll(): Promise<Task[]> {
    return this.taskModel.find().exec();
  }

  async findOneTask(taskId: string): Promise<Task> {
    return this.taskModel
      .findById(taskId)
      .populate([
        {
          path: 'parentTask',
          select: '_id title',
        },
        {
          path: 'subTasks',
          select: '_id title',
          model: 'Task',
        },
        {
          path: 'assignee',
          select: '_id firstName lastName profilePhoto',
        },
        {
          path: 'createdByUser',
          select: '_id firstName lastName profilePhoto',
        },
        {
          path: 'project',
          select: '_id name',
        },
      ])
      .lean(); // Bellek kullanımını optimize eder
  }

  async getAllTasksByProject(projectId: string) {
    return this.taskModel
      .find({
        project: projectId,
      })
      .populate({
        path: 'parentTask',
        select: '_id',
      });
  }

  async getAllTasksByProjectDetail(projectId: string) {
    return this.taskModel
      .find({
        project: projectId,
      })
      .populate({
        path: 'assignee',
        select: '_id firstName lastName profilePhoto',
      })
      .select('_id title status priority assignee description');
  }

  async getAllMyTasks(userId) {
    return this.taskModel
      .find({
        assignee: userId,
      })
      .populate({
        path: 'parentTask',
        select: '_id title',
      })
      .populate({
        path: 'subTasks',
        select: '_id title',
        model: 'Task',
      });
  }
}
