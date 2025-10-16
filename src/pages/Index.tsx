import { MadeWithDyad } from "@/components/made-with-dyad";
import { useSession } from "@/contexts/SessionContext";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, Link } from "react-router-dom";

const Index = () => {
  const { user } = useSession();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
      <div className="text-center bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md">
        <h1 className="text-4xl font-bold mb-4 text-gray-900 dark:text-white">
          Welcome, {user?.email}!
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-300 mb-6">
          This is your Notary Office Manager dashboard.
        </p>
        <div className="flex flex-col space-y-4">
          <Button asChild>
            <Link to="/clients">Manage Clients</Link>
          </Button>
          <Button asChild>
            <Link to="/notarizations">Manage Notarizations</Link>
          </Button>
          <Button asChild>
            <Link to="/profile">Manage Profile</Link>
          </Button>
          <Button onClick={handleLogout} variant="destructive">
            Logout
          </Button>
        </div>
      </div>
      <MadeWithDyad />
    </div>
  );
};

export default Index;