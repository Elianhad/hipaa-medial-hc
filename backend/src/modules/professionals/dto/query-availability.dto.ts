import { IsString, Matches } from 'class-validator';

export class QueryAvailabilityDto {
    @IsString()
    @Matches(/^\d{4}-\d{2}-\d{2}$/, {
        message: 'startDate must be a valid date in YYYY-MM-DD format',
    })
    startDate: string;

    @IsString()
    @Matches(/^\d{4}-\d{2}-\d{2}$/, {
        message: 'endDate must be a valid date in YYYY-MM-DD format',
    })
    endDate: string;
}
