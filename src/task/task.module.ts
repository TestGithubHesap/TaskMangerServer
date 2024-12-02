import { Module } from '@nestjs/common';
import { TaskResolver } from './task.resolver';
import { TaskService } from './task.service';
import { AuthModule } from 'src/auth/auth.module';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from 'src/schemas/user.schema';
import { Task, TaskSchema } from 'src/schemas/task.schema';
import { Project, ProjectSchema } from 'src/schemas/project.schema';
import { SharedModule } from 'src/Shared/shared.module';

@Module({
  imports: [
    AuthModule,
    SharedModule.registerRmq('NOTIFICATION_SERVICE', 'NOTIFICATION'),
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Task.name, schema: TaskSchema },
      { name: Project.name, schema: ProjectSchema },
    ]),
  ],
  providers: [TaskResolver, TaskService],
  exports: [TaskService],
})
export class TaskModule {}
