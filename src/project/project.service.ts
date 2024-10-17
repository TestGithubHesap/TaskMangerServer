import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Project, ProjectDocument } from 'src/schemas/project.schema';
import { CreateProjectInput } from './dto/createProjectInput';
import { User, UserDocument, UserRole } from 'src/schemas/user.schema';
import { GraphQLError } from 'graphql';
import { Company } from 'src/schemas/company.schema';
import { PUB_SUB } from 'src/modules/pubSub.module';
import { RedisPubSub } from 'graphql-redis-subscriptions';

@Injectable()
export class ProjectService {
  constructor(
    @InjectModel(Project.name) private projectModel: Model<ProjectDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    // @InjectModel(User.name) private userModel: Model<UserDocument>,
    @Inject(PUB_SUB)
    private readonly pubSub: RedisPubSub,
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
  private parseDateString(dateString: string): Date {
    const [day, month, year] = dateString.split('.');
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  }

  async createProject(
    userId: string,
    createProjectInput: CreateProjectInput,
  ): Promise<Project> {
    const user = await this.userModel.findById(userId);
    const rolesToCheck = [UserRole.EXECUTIVE, UserRole.ADMIN];
    if (
      !user ||
      !user.company ||
      !rolesToCheck.some((role) => user.roles.includes(role))
    ) {
      this.handleError(
        'You are not authorized to create a project',
        HttpStatus.UNAUTHORIZED,
      );
    }
    try {
      const createdProject = new this.projectModel({
        ...createProjectInput,
        company: user.company,
        projectManager: createProjectInput.projectManagerId,
        team: createProjectInput.teamMemberIds,
        startDate: this.parseDateString(createProjectInput.startDate),
        endDate: this.parseDateString(createProjectInput.endDate),
        createdByUser: user._id,
      });
      const savedProject = await createdProject.save();

      this.pubSub.publish('createCompanyProject', {
        createCompanyProject: {
          _id: savedProject._id,
          name: savedProject.name,
          description: savedProject.description,
          company: savedProject.company,
        },
      });
      return savedProject;
    } catch (error) {
      this.handleError(
        'Error creating project',
        HttpStatus.INTERNAL_SERVER_ERROR,
        error,
      );
    }
  }

  async getAllProjectsByCompany(
    userId: string,
  ): Promise<Project[]> {
    const user = await this.userModel.findById(userId);

    if (!user) {
      this.handleError(
        'You are not authorized to view projects',
        HttpStatus.UNAUTHORIZED,
      );
    }
    return this.projectModel.find({
      company: user.company,
    });
  }
}
