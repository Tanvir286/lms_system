import { Test, TestingModule } from '@nestjs/testing';
import { ExtrasService } from './extras.service';

describe('ExtrasService', () => {
  let service: ExtrasService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ExtrasService],
    }).compile();

    service = module.get<ExtrasService>(ExtrasService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
