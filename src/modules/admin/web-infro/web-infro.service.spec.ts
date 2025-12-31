import { Test, TestingModule } from '@nestjs/testing';
import { WebInfroService } from './web-infro.service';

describe('WebInfroService', () => {
  let service: WebInfroService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [WebInfroService],
    }).compile();

    service = module.get<WebInfroService>(WebInfroService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
