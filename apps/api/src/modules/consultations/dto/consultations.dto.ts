import { IsString, MaxLength, MinLength } from 'class-validator';

/**
 * Declared here rather than inline in the controller: the `@nestjs/swagger`
 * CLI plugin dispatches per file by filename suffix, so a DTO defined in a
 * `.controller.ts` file gets no schema and is documented as an empty object.
 */

/** A message posted into a consultation's thread. */
export class SendMessageDto {
  @IsString()
  @MinLength(1, { message: 'Write something first.' })
  @MaxLength(2000)
  body!: string;
}
