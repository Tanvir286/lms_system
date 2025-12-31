import { Test, TestingModule } from '@nestjs/testing';
import { WebInfroController } from './web-infro.controller';
import { WebInfroService } from './web-infro.service';

describe('WebInfroController', () => {
  let controller: WebInfroController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WebInfroController],
      providers: [WebInfroService],
    }).compile();

    controller = module.get<WebInfroController>(WebInfroController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
