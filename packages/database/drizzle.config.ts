import dotenv from 'dotenv';
import { defineConfig } from 'drizzle-kit';

dotenv.config({ path: "../../apps/main/.env.local" });

export default defineConfig({                                                 
  out: './migrations',                                                
  schema: './src/schema.ts',                                           
  dialect: 'postgresql',                                                      
  dbCredentials: {                                                            
    url: process.env.DATABASE_URL!,                                           
  },                                                                          
});  