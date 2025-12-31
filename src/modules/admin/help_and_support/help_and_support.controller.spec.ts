import { Test, TestingModule } from '@nestjs/testing';
import { HelpAndSupportController } from './help_and_support.controller';
import { HelpAndSupportService } from './help_and_support.service';

describe('HelpAndSupportController', () => {
  let controller: HelpAndSupportController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HelpAndSupportController],
      providers: [HelpAndSupportService],
    }).compile();

    controller = module.get<HelpAndSupportController>(HelpAndSupportController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
