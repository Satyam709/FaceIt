import { Link } from 'react-router-dom';

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-lg w-96">
        <h1 className="text-3xl font-semibold text-center mb-6">Welcome to WebRTC</h1>
        <p className="text-center mb-6">Choose your role to get started:</p>
        <div className="flex flex-col gap-4">
          <Link to="/receiver" className="bg-blue-500 text-white py-2 px-4 rounded-md text-center hover:bg-blue-600 transition-all">
            Receiver Page
          </Link>
          <Link to="/sender" className="bg-green-500 text-white py-2 px-4 rounded-md text-center hover:bg-green-600 transition-all">
            Sender Page
          </Link>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
