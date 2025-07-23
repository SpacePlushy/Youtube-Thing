import { SignIn } from '@clerk/nextjs';

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Welcome Back</h1>
          <p className="text-muted-foreground">
            Sign in to access unlimited transcript extractions
          </p>
        </div>
        <SignIn 
          appearance={{
            elements: {
              rootBox: "mx-auto",
              card: "bg-background border border-border shadow-lg",
              headerTitle: "hidden",
              headerSubtitle: "hidden",
              socialButtonsBlockButton: "bg-background border border-border hover:bg-muted text-foreground",
              formFieldLabel: "text-foreground",
              formFieldInput: "bg-background border-border text-foreground",
              footerActionLink: "text-primary hover:text-primary/80"
            }
          }}
          redirectUrl="/"
          signUpUrl="/sign-up"
        />
      </div>
    </div>
  );
}