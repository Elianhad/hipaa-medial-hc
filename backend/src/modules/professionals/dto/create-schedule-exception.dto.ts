import {
    IsDate,
    IsNotEmpty,
    IsOptional,
    IsString,
    IsUUID,
    MaxLength,
    Validate,
    ValidatorConstraint,
    ValidatorConstraintInterface,
    ValidationArguments,
} from 'class-validator';
import { Type } from 'class-transformer';

@ValidatorConstraint({ name: 'isEndDateAfterStartDate', async: false })
class IsEndDateAfterStartDateConstraint implements ValidatorConstraintInterface {
    validate(endDate: Date, args: ValidationArguments): boolean {
        const dto = args.object as CreateScheduleExceptionDto;

        if (!(dto.startDate instanceof Date) || Number.isNaN(dto.startDate.getTime())) {
            return false;
        }

        if (!(endDate instanceof Date) || Number.isNaN(endDate.getTime())) {
            return false;
        }

        return endDate.getTime() > dto.startDate.getTime();
    }

    defaultMessage(): string {
        return 'endDate debe ser posterior a startDate';
    }
}

export class CreateScheduleExceptionDto {
    @IsOptional()
    @IsUUID('4')
    locationId?: string;

    @Type(() => Date)
    @IsDate({ message: 'startDate debe ser una fecha válida' })
    startDate: Date;

    @Type(() => Date)
    @IsDate({ message: 'endDate debe ser una fecha válida' })
    @Validate(IsEndDateAfterStartDateConstraint)
    endDate: Date;

    @IsString()
    @IsNotEmpty()
    @MaxLength(500)
    reason: string;
}
