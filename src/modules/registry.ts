import { financesModule } from "@/modules/finances/module";
import { repasModule } from "@/modules/repas/module";
import { todoModule } from "@/modules/todo/module";
import type { AppModule } from "@/modules/types";

/** Adding a module = creating src/modules/<name> and adding one line here. */
export const appModules: readonly AppModule[] = [financesModule, todoModule, repasModule];
