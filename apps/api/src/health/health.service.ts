import { Injectable } from "@nestjs/common";

export interface HealthStatus {
  service: "ami-api";
  status: "ok";
}

@Injectable()
export class HealthService {
  getStatus(): HealthStatus {
    return {
      service: "ami-api",
      status: "ok",
    };
  }
}
