import { financesModule } from "@/modules/finances/module";
import type { AppModule } from "@/modules/types";

/** Adding a module = creating src/modules/<name> and adding one line here. */
export const appModules: readonly AppModule[] = [financesModule];
