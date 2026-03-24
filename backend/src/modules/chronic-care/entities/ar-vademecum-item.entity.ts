import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    Index,
} from 'typeorm';

@Entity('ar_vademecum_items')
@Index(['dciName'])
@Index(['snomedCtArCode'])
export class ArVademecumItem {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'dci_name', length: 200 })
    dciName: string;

    @Column({ name: 'brand_name', nullable: true, length: 200 })
    brandName: string;

    @Column({ name: 'snomed_ct_ar_code', length: 30 })
    snomedCtArCode: string;

    @Column({ name: 'snomed_display', length: 300 })
    snomedDisplay: string;

    @Column({ name: 'atc_code', nullable: true, length: 20 })
    atcCode: string;

    @Column({ default: true })
    active: boolean;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
}
