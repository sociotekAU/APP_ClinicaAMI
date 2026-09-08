import { Type } from "class-transformer";
import { IsInt, IsOptional, Max, Min } from "class-validator";

export class PaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: "page debe ser un número entero." })
  @Min(1, { message: "page debe ser al menos 1." })
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: "pageSize debe ser un número entero." })
  @Min(5, { message: "pageSize debe ser al menos 5." })
  @Max(100, { message: "pageSize no puede superar 100." })
  pageSize = 10;
}
