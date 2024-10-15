// task.service.ts
import { Injectable, BadRequestException, HttpStatus } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Task, TaskDocument } from 'src/schemas/task.schema';
import { CreateTaskInput } from './dto/createTaskInput';
import { GraphQLError } from 'graphql';

@Injectable()
export class TaskService {
  constructor(@InjectModel(Task.name) private taskModel: Model<TaskDocument>) {}

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
      const createdTask = new this.taskModel({
        ...createTaskDto,
        project: createTaskDto.projectId,
        assignee: createTaskDto.assigneeId,
        dueDate: this.parseDateString(createTaskDto.dueDate),
        createdByUser: userId,
      });

      return await createdTask.save();
    } catch (error) {
      this.handleError(
        'Error creating task',
        HttpStatus.INTERNAL_SERVER_ERROR,
        error,
      );
    }
  }

  async updateTaskHierarchy(
    taskId: string,
    parentTaskId: string,
  ): Promise<Task> {
    try {
      const [task, parentTask] = await Promise.all([
        this.taskModel.findById(taskId),
        this.taskModel.findById(parentTaskId),
      ]);

      if (!task || !parentTask) {
        this.handleError('Task or parent task not found', HttpStatus.NOT_FOUND);
      }
      if (task.project !== parentTask.project) {
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
          $pull: { subTasks: task._id },
        });
      }

      // Görevi güncelle
      await this.taskModel.findByIdAndUpdate(taskId, {
        $set: { parentTask: parentTaskId },
        $addToSet: { ancestors: parentTaskId }, // ancestors dizisine parentTaskId'yi ekle
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

  async findOne(id: string): Promise<Task> {
    return this.taskModel.findById(id).exec();
  }
}
