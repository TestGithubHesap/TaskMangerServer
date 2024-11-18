// task.service.ts
import { Injectable, BadRequestException, HttpStatus } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Task, TaskDocument, TaskStatus } from 'src/schemas/task.schema';
import { CreateTaskInput } from './dto/createTaskInput';
import { GraphQLError } from 'graphql';
import { Project, ProjectDocument } from 'src/schemas/project.schema';
import { User, UserDocument, UserRole } from 'src/schemas/user.schema';
import { UpdateTaskInput } from './dto/updateTaskInput';

@Injectable()
export class TaskService {
  constructor(
    @InjectModel(Task.name) private taskModel: Model<TaskDocument>,
    @InjectModel(Project.name) private projectModel: Model<ProjectDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
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

  async updateTask(userId: string, input: UpdateTaskInput) {
    const { taskId, ...updateData } = input;
    const user = await this.userModel.findById(userId);
    const task = await this.taskModel.findById(taskId).populate({
      path: 'project',
      select: 'company',
    });
    if (!user || !task) {
      this.handleError('user or  task  not found', HttpStatus.NOT_FOUND);
    }

    if (
      !user.roles.includes(UserRole.ADMIN) &&
      (!user.roles.includes(UserRole.EXECUTIVE) ||
        user.company.toString() !== task.project.company.toString())
    ) {
      this.handleError(
        'The user does not have permission to make changes to the task.',
        HttpStatus.UNAUTHORIZED,
      );
    }
    if (task.assignee.toString() !== updateData.assignee) {
      const project = await this.projectModel.findById(task.project._id);
      if (!project) {
        this.handleError('User not found', HttpStatus.NOT_FOUND);
      }
      if (!project.team.includes(new Types.ObjectId(updateData.assignee))) {
        project.team.push(new Types.ObjectId(updateData.assignee));
        await project.save();
      }
    }
    // `updateData` içindeki sadece gönderilen alanları günceller
    Object.keys(updateData).forEach((key) => {
      if (updateData[key] !== undefined) {
        task[key] =
          key == 'dueDate'
            ? this.parseDateString(updateData[key])
            : updateData[key];
      }
    });

    return await task.save(); // Task'i kaydet ve güncellenmiş task'i döndür
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
      const user = await this.userModel.findById(userId);

      if (!user || !user.company) {
        this.handleError(
          'User not found or not associated with any company',
          HttpStatus.NOT_FOUND,
        );
      }

      // Task'ı proje bilgisiyle birlikte bul
      const task = await this.taskModel
        .findOne({
          _id: taskId,
          assignee: userId,
        })
        .populate('project'); // project alanını populate et

      if (!task) {
        this.handleError('Task not found', HttpStatus.NOT_FOUND);
      }

      // Task'ın projesi yoksa hata döndür
      if (!task.project) {
        this.handleError(
          'Task is not associated with any project',
          HttpStatus.BAD_REQUEST,
        );
      }

      // Task'ın projesinin company ID'si ile user'ın company ID'sini karşılaştır
      if (task.project.company.toString() !== user.company.toString()) {
        this.handleError(
          'User is not authorized to update this task',
          HttpStatus.FORBIDDEN,
        );
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

  async findOneTask(userId: string, taskId: string): Promise<Task> {
    const [user, task] = await Promise.all([
      this.userModel.findById(userId),
      this.taskModel
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
            select: '_id name company',
          },
        ])
        .lean(),
    ]);
    if (!user || !task) {
      this.handleError('user or task not  found', HttpStatus.NOT_FOUND);
    }

    if (
      !user.roles.includes(UserRole.ADMIN) &&
      user.company.toString() !== task.project.company.toString()
    ) {
      this.handleError(
        'The user does not have permission to make changes to the task.',
        HttpStatus.UNAUTHORIZED,
      );
    }

    return task;
    // const projectMatchStage = user.roles.includes(UserRole.ADMIN)
    //   ? {}
    //   : { 'project.company': user.company.toString() };
    // const task = await this.taskModel.aggregate([
    //   // Kullanıcıya atanan görevleri bul
    //   {
    //     $match: {
    //       _id: taskId,
    //     },
    //   },
    //   // Projeyi join et
    //   {
    //     $lookup: {
    //       from: 'projects',
    //       let: { projectId: '$project' },
    //       pipeline: [
    //         {
    //           $match: {
    //             $expr: {
    //               $eq: ['$_id', { $toObjectId: '$$projectId' }], // companyId'yi ObjectId'ye dönüştürüyoruz
    //             },
    //           },
    //         },
    //         {
    //           $project: {
    //             _id: 1,
    //             company: 1,
    //             name: 1,
    //           },
    //         },
    //       ],
    //       as: 'project',
    //     },
    //   },
    //   // Array'i tekil objeye çevir
    //   {
    //     $unwind: '$project',
    //   },
    //   // Şirket kontrolü
    //   {
    //     $match: {
    //       projectMatchStage,
    //     },
    //   },
    //   // Parent task bilgilerini getir
    //   {
    //     $lookup: {
    //       from: 'tasks',
    //       let: { parentTaskId: '$parentTask' },
    //       pipeline: [
    //         {
    //           $match: {
    //             $expr: {
    //               $eq: ['$_id', { $toObjectId: '$$parentTaskId' }],
    //             },
    //           },
    //         },
    //         {
    //           $project: {
    //             _id: 1,
    //             title: 1,
    //           },
    //         },
    //       ],
    //       as: 'parentTask',
    //     },
    //   },
    //   // // Parent task array'ini tekil objeye çevir
    //   {
    //     $unwind: {
    //       path: '$parentTask',
    //       preserveNullAndEmptyArrays: true,
    //     },
    //   },
    //   // // Sub tasks bilgilerini getir
    //   {
    //     $lookup: {
    //       from: 'tasks',
    //       let: {
    //         subTaskIds: {
    //           $map: {
    //             input: '$subTasks',
    //             as: 'id',
    //             in: { $toObjectId: '$$id' },
    //           },
    //         },
    //       },
    //       pipeline: [
    //         {
    //           $match: {
    //             $expr: {
    //               $in: ['$_id', '$$subTaskIds'],
    //             },
    //           },
    //         },
    //         {
    //           $project: {
    //             _id: 1,
    //             title: 1,
    //           },
    //         },
    //       ],
    //       as: 'subTasks',
    //     },
    //   },

    //   // // Sonuçları düzenle
    //   {
    //     $project: {
    //       _id: 1,
    //       title: 1,
    //       description: 1,
    //       status: 1,
    //       priority: 1,
    //       dueDate: 1,
    //       completedAt: 1,
    //       createdAt: 1,
    //       updatedAt: 1,
    //       project: {
    //         _id: 1,
    //         name: 1,
    //         company: 1,
    //       },
    //       parentTask: 1,
    //       subTasks: 1,
    //     },
    //   },
    // ]);
  }

  async getAllTasksByProject(projectId: string): Promise<{
    tasks: Task[];
    project: Project;
  }> {
    const [project, tasks] = await Promise.all([
      this.projectModel.findById(projectId).populate({
        path: 'projectManager',
        select: '_id',
      }),
      this.taskModel
        .find({
          project: projectId,
        })
        .populate({
          path: 'parentTask',
          select: '_id',
        }),
    ]);
    return {
      project,
      tasks,
    };
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

  async getAllMyTasks(userId: string) {
    // Önce kullanıcı bilgilerini alalım
    const user = await this.userModel.findById(userId);

    if (!user || !user.company) {
      throw new Error('User not found or not associated with any company');
    }

    const tasks = await this.taskModel.aggregate([
      // Kullanıcıya atanan görevleri bul
      {
        $match: {
          assignee: userId,
        },
      },
      // Projeyi join et
      {
        $lookup: {
          from: 'projects',
          let: { projectId: '$project' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: ['$_id', { $toObjectId: '$$projectId' }], // companyId'yi ObjectId'ye dönüştürüyoruz
                },
              },
            },
            {
              $project: {
                _id: 1,
                company: 1,
              },
            },
          ],
          as: 'project',
        },
      },
      // Array'i tekil objeye çevir
      {
        $unwind: '$project',
      },
      // Şirket kontrolü
      {
        $match: {
          'project.company': user.company,
        },
      },
      // Parent task bilgilerini getir
      {
        $lookup: {
          from: 'tasks',
          let: { parentTaskId: '$parentTask' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: ['$_id', { $toObjectId: '$$parentTaskId' }],
                },
              },
            },
            {
              $project: {
                _id: 1,
                title: 1,
              },
            },
          ],
          as: 'parentTask',
        },
      },
      // // Parent task array'ini tekil objeye çevir
      {
        $unwind: {
          path: '$parentTask',
          preserveNullAndEmptyArrays: true,
        },
      },
      // // Sub tasks bilgilerini getir
      {
        $lookup: {
          from: 'tasks',
          let: {
            subTaskIds: {
              $map: {
                input: '$subTasks',
                as: 'id',
                in: { $toObjectId: '$$id' },
              },
            },
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $in: ['$_id', '$$subTaskIds'],
                },
              },
            },
            {
              $project: {
                _id: 1,
                title: 1,
              },
            },
          ],
          as: 'subTasks',
        },
      },

      // // Sonuçları düzenle
      {
        $project: {
          _id: 1,
          title: 1,
          description: 1,
          status: 1,
          priority: 1,
          dueDate: 1,
          completedAt: 1,
          createdAt: 1,
          updatedAt: 1,
          project: {
            _id: 1,
            name: 1,
            company: 1,
            status: 1,
          },
          parentTask: 1,
          subTasks: 1,
        },
      },
    ]);
    return tasks;
  }
}
