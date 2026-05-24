import { AppProviders } from "./providers/AppProviders";
import { PortfolioConsole } from "../features/portfolio/ui/PortfolioConsole";

export function App() {
  return (
    <AppProviders>
      <PortfolioConsole />
    </AppProviders>
  );
}
