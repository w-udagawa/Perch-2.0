import { SurveyProvider } from "@/lib/store";
import { SurveyWizard } from "@/components/survey/SurveyWizard";

export default function Home() {
  return (
    <SurveyProvider>
      <SurveyWizard />
    </SurveyProvider>
  );
}
