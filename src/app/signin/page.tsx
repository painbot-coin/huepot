import { HouseFloor } from "@/components/HouseFloor";
import { LazySigninForm } from "@/components/LazyViews";

export default function SigninPage() {
  return (
    <HouseFloor kicker="Sign in">
      <main className="app-page is-in-floor">
        <LazySigninForm />
      </main>
    </HouseFloor>
  );
}
