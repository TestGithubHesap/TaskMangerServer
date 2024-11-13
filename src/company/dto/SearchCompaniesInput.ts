import { Field, InputType } from '@nestjs/graphql';
import { IsNumber, IsString } from 'class-validator';

@InputType()
export class SearchCompaniesInput {
  @Field(() => String)
  @IsString()
  searchText: string;

  @Field({ defaultValue: 1 })
  @IsNumber()
  page: number;

  @Field({ defaultValue: 10 })
  @IsNumber()
  limit: number;
}
