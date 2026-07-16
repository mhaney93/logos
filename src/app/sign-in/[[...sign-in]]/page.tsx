import { SignIn } from "@clerk/nextjs";

export default function Page() {
  return (
    <div className="flex min-h-full flex-1 items-center justify-center">
      <SignIn />
    </div>
  );
}
