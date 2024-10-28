import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

@InputType()
export class MediaContentInput {
  @Field()
  @IsString()
  @IsNotEmpty()
  url: string;

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  thumbnail?: string;

  @Field({ nullable: true })
  @IsOptional()
  duration?: number;

  @Field({ nullable: true })
  @IsOptional()
  size?: number;

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  mimeType?: string;
}
