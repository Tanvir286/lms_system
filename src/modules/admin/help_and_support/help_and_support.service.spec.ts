import { Test, TestingModule } from '@nestjs/testing';
import { HelpAndSupportService } from './help_and_support.service';

describe('HelpAndSupportService', () => {
  let service: HelpAndSupportService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [HelpAndSupportService],
    }).compile();

    service = module.get<HelpAndSupportService>(HelpAndSupportService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
