import CopilotForm from '@/components/CopilotPromptForm';

export default function Page() {
  return (
    <div className="h-screen flex flex-col">
      <main className="flex flex-1">
        <CopilotForm />
      </main>
    </div>
  );
}
