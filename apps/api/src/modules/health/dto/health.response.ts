import { ApiProperty } from '@nestjs/swagger';

/**
 * The health probe's answer.
 *
 * The one response in the API with no `@remedyo/shared` counterpart: it is
 * consumed by container orchestrators rather than by the web app, so the shape
 * is declared here and the controller returns this type directly.
 */
export class HealthResponseDto {
  @ApiProperty({ example: 'ok', description: 'Always `ok`; a failure is a non-200.' })
  status!: string;

  @ApiProperty({
    enum: ['up', 'down'],
    description: 'The result of a `SELECT 1` against the database.',
  })
  database!: string;
}
