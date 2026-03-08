import path from "node:path";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: path.join(__dirname, "prisma", "schema.prisma"),
  datasource: {
    url: "postgresql://hata1234@localhost:5432/knowledge_hub",
  },
  migrate: {
    url: "postgresql://hata1234@localhost:5432/knowledge_hub",
  },
});
