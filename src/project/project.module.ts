import { Module } from '@nestjs/common';
import { ProjectResolver } from './project.resolver';
import { ProjectService } from './project.service';
import { AuthModule } from 'src/auth/auth.module';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from 'src/schemas/user.schema';
import { Company, CompanySchema } from 'src/schemas/company.schema';
import { Project, ProjectSchema } from 'src/schemas/project.schema';
import { PubSubModule } from 'src/modules/pubSub.module';
import { Task, TaskSchema } from 'src/schemas/task.schema';
import { TaskModule } from 'src/task/task.module';
import { SharedModule } from 'src/Shared/shared.module';
import { NotificationModule } from 'src/notification/notification.module';

@Module({
  imports: [
    AuthModule,
    TaskModule,
    PubSubModule,
    NotificationModule,
    SharedModule.registerRmq('NOTIFICATION_SERVICE', 'NOTIFICATION'),
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Company.name, schema: CompanySchema },
      { name: Project.name, schema: ProjectSchema },
      { name: Task.name, schema: TaskSchema },
    ]),
  ],
  providers: [ProjectResolver, ProjectService],
})
export class ProjectModule {}
