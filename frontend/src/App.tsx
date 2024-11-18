import { useEffect, useState } from "react";
import { 
  useBalance,
  useConnectUI,
  useIsConnected,
  useDisconnect,
  useWallet,
  useAccount,
} from "@fuels/react";
import { PetitionContract } from "./sway-api";
import { bn } from "fuels";
import { 
  Loader2Icon, 
  SignatureIcon, 
  XCircleIcon,
  ClockIcon,
  UsersIcon,
  WalletIcon,
  PlusCircleIcon,
  UndoIcon,
  XIcon,
  CheckIcon
} from "lucide-react";
import { Toaster, toast } from "react-hot-toast";

const CONTRACT_ID =
  "0x71818ef1ccf1ae678fe41165a6ee2053d1ac88e0c8fc20a803f490c79bc9ba90";

interface Campaign {
  id: number;
  author: string;
  deadline: number;
  state: 'Progress' | 'Cancelled' | 'Successful';
  total_signs?: number;
}

const getStateStyle = (state: Campaign['state']) => {
  switch (state) {
    case 'Progress':
      return 'bg-green-900/30 text-green-400 border border-green-700/50';
    case 'Cancelled':
      return 'bg-red-900/30 text-red-400 border border-red-700/50';
    case 'Successful':
      return 'bg-gray-900/30 text-gray-400 border border-gray-700/50';
  }
};

const formatDeadline = (deadline: number) => {
  const date = new Date(deadline * 1000);
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  
  if (days > 0) {
    return `${days}d ${hours}h remaining`;
  } else if (hours > 0) {
    return `${hours}h remaining`;
  } else {
    return 'Ending soon..';
  }
};

export default function App() {
  const [contract, setContract] = useState<PetitionContract>();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [newCampaignDeadline, setNewCampaignDeadline] = useState("");
  const [loading, setLoading] = useState(false);
  const [showManageModal, setShowManageModal] = useState(false);
  const [activeEditMenu, setActiveEditMenu] = useState<number | null>(null);
  const { connect, isConnecting } = useConnectUI();
  const { isConnected } = useIsConnected();
  const { disconnect } = useDisconnect();
  const { account } = useAccount();
  const { wallet } = useWallet();
  const { balance } = useBalance({
    address: account,
    assetId: wallet?.provider.getBaseAssetId(),
  });

  const handleDisconnect = async () => {
    await disconnect();
    setContract(undefined);
    setCampaigns([]);
  };

  const handleConnect = async () => {
    try {
      await connect();
    } catch (err) {
      toast.error("Failed to connect wallet");
    }
  };

  useEffect(() => {
    async function initializeContract() {
      if (isConnected && wallet) {
        const petitionContract = new PetitionContract(CONTRACT_ID, wallet);
        setContract(petitionContract);
        await loadCampaigns(petitionContract);
      }
    }

    initializeContract();
  }, [isConnected, wallet]);


  const loadCampaigns = async (petitionContract: PetitionContract) => {
    const loadingToast = toast.loading("Loading campaigns...");
    try {
      const totalCampaigns = await petitionContract.functions.total_campaigns().get();
      const campaignsList: Campaign[] = [];
      
      for (let i = 1; i <= totalCampaigns.value.toNumber(); i++) {
        const campaignInfo = await petitionContract.functions.campaign_info(bn(i)).get();
        if (campaignInfo.value) {
          campaignsList.push({
            id: i,
            author: campaignInfo.value.author.Address?.bits.toString() || "",
            deadline: campaignInfo.value.deadline.toNumber(),
            state: campaignInfo.value.state as 'Progress' | 'Cancelled' | 'Successful',
            total_signs: campaignInfo.value.total_signs.toNumber()
          });
        }
      }
      
      setCampaigns(campaignsList);
      toast.dismiss(loadingToast);
    } catch (error: any) {
      toast.dismiss(loadingToast);
      const message = getErrorMessage(error);
      toast.error(message);
    }
  };

  const handleCreateCampaign = async () => {
    if (!contract) return;
    
    const loadingToast = toast.loading("Creating campaign...");
    try {
      setLoading(true);
      const deadline = Math.floor(new Date(newCampaignDeadline).getTime() / 1000);
      await contract.functions.create_campaign(bn(deadline)).call();
      setNewCampaignDeadline("");
      await loadCampaigns(contract);
      toast.success("Campaign created successfully!");
      setShowManageModal(false);
    } catch (error: any) {
      const message = getErrorMessage(error);
      toast.error(message);
      setLoading(false);
    } finally {
      toast.dismiss(loadingToast);
      setLoading(false);
    }
  };

  const handleSignPetition = async (id: number) => {
    if (!contract) return;
    
    const loadingToast = toast.loading("Signing petition...");
    try {
      setLoading(true);
      await contract.functions.sign_petition(bn(id)).call();
      await loadCampaigns(contract);
      toast.success("Petition signed successfully!");
    } catch (error: any) {
      const message = getErrorMessage(error);
      toast.error(message);
      setLoading(false);
    } finally {
      toast.dismiss(loadingToast);
      setLoading(false);
    }
  };

  const handleUnsignPetition = async (id: number) => {
    if (!contract) return;
    
    const loadingToast = toast.loading("Unsigning petition...");
    try {
      setLoading(true);
      await contract.functions.unsign_petition(bn(id)).call();
      await loadCampaigns(contract);
      toast.success("Petition unsigned successfully!");
    } catch (error: any) {
      const message = getErrorMessage(error);
      toast.error(message);
      setLoading(false);
    } finally {
      toast.dismiss(loadingToast);
      setLoading(false);
    }
  };

  const handleCancelCampaign = async (id: number) => {
    if (!contract) return;
    
    const loadingToast = toast.loading("Cancelling campaign...");
    try {
      setLoading(true);
      await contract.functions.cancel_campaign(bn(id)).call();
      await loadCampaigns(contract);
      toast.success("Campaign cancelled successfully!");
      setActiveEditMenu(null);
    } catch (error: any) {
      const message = getErrorMessage(error);
      toast.error(message);
      setLoading(false);
    } finally {
      toast.dismiss(loadingToast);
      setLoading(false);
    }
  };

  const handleEndCampaign = async (id: number) => {
    if (!contract) return;
    
    const loadingToast = toast.loading("Ending campaign...");
    try {
      setLoading(true);
      await contract.functions.end_campaign(bn(id)).call();
      await loadCampaigns(contract);
      toast.success("Campaign ended successfully!");
      setActiveEditMenu(null);
    } catch (error: any) {
      const message = getErrorMessage(error);
      toast.error(message);
      setLoading(false);
    } finally {
      toast.dismiss(loadingToast);
      setLoading(false);
    }
  };

  const getErrorMessage = (error: any) => {
    const errorMessage = error.message || "";
    
    // Campaign errors
    if (errorMessage.includes("CampaignEnded")) {
      return "This campaign has already ended";
    }
    if (errorMessage.includes("CampaignHasBeenCancelled")) {
      return "This campaign has been cancelled";
    }
    if (errorMessage.includes("DeadlineNotReached")) {
      return "The campaign's deadline has not been reached yet";
    }
    
    // Creation errors
    if (errorMessage.includes("DeadlineMustBeInTheFuture")) {
      return "The campaign's deadline must be in the future";
    }
    
    // User errors
    if (errorMessage.includes("SuccessfulCampaign")) {
      return "Campaign has already been marked as successful";
    }
    if (errorMessage.includes("AlreadySigned")) {
      return "You have already signed this petition";
    }
    if (errorMessage.includes("InvalidID")) {
      return "Invalid campaign ID";
    }
    if (errorMessage.includes("UnauthorizedUser")) {
      return "You are not authorized to perform this action";
    }
    if (errorMessage.includes("UserHasNotSigned")) {
      return "You haven't signed this petition";
    }
    
    return errorMessage || "An error occurred";
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gray-900 text-white">
        <Toaster position="bottom-center" 
          toastOptions={{
            duration: 3000,
            style: {
              background: '#1f2937',
              color: '#fff',
              borderRadius: '0.5rem',
              border: '1px solid rgba(75, 85, 99, 0.3)',
            },
            success: {
              iconTheme: {
                primary: '#10b981',
                secondary: '#fff',
              },
            },
            error: {
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fff',
              },
            },
          }} 
        />
        <div className="min-h-screen bg-black flex items-center justify-center p-4">
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-8 w-full max-w-md">
            <div className="flex justify-center mb-8">
              <SignatureIcon className="w-16 h-16 text-green-500" />
            </div>
            <h1 className="text-3xl font-bold text-center mb-8 text-green-50">Petition dApp</h1>
            <button
              onClick={handleConnect}
              disabled={isConnecting}
              className="w-full h-16 bg-green-600 hover:bg-green-500 disabled:bg-green-900 
                       text-white text-lg font-medium rounded-xl transition-all duration-200 
                       flex items-center justify-center gap-3 shadow-lg shadow-green-900/30"
            >
              {isConnecting ? (
                <>
                  <Loader2Icon className="w-6 h-6 animate-spin" />
                  Connecting...
                </>
              ) : (
                "Connect Wallet"
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Toaster position="bottom-center" 
        toastOptions={{
          duration: 3000,
          style: {
            background: '#1f2937',
            color: '#fff',
            borderRadius: '0.5rem',
            border: '1px solid rgba(75, 85, 99, 0.3)',
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }} 
      />
      <div className="min-h-screen bg-black p-6">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Header */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-4">
                <SignatureIcon className="w-10 h-10 text-green-500" />
                <h1 className="text-3xl font-bold text-green-50">Petition dApp</h1>
              </div>
              <div className="flex items-center gap-2">
                {isConnected && (
                  <button
                    onClick={() => setShowManageModal(true)}
                    className="px-6 h-12 bg-green-600 hover:bg-green-500 text-white 
                             rounded-xl transition-all flex items-center gap-2"
                  >
                    <PlusCircleIcon className="w-5 h-5" />
                    Create Petition
                  </button>
                )}
                <div className="relative wallet-trigger group">
                  <button
                    className="w-12 h-12 bg-zinc-800/50 hover:bg-zinc-700 text-white 
                             rounded-xl transition-all flex items-center justify-center
                             border border-zinc-700/50 hover:border-zinc-600 relative"
                  >
                    <WalletIcon className="w-5 h-5" />
                    <div className="absolute top-0 right-0 w-3 h-3">
                      <div className="absolute inset-0 bg-green-500 rounded-full animate-ping opacity-50"></div>
                      <div className="absolute inset-0 bg-green-500 rounded-full"></div>
                    </div>
                  </button>
                  
                  <div className="wallet-dropdown absolute right-0 mt-2 w-72 bg-zinc-900/95 rounded-xl shadow-xl overflow-hidden z-50 backdrop-blur-sm border border-zinc-800">
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span className="text-sm font-medium text-green-50">Connected</span>
                        </div>
                        <button
                          onClick={handleDisconnect}
                          className="text-zinc-400 hover:text-red-400 transition-colors p-1 rounded-lg hover:bg-zinc-800"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M9.293 15.293a1 1 0 001.414 0l3-3a1 1 0 000-1.414l-3-3a1 1 0 00-1.414 1.414L10.586 10H4a1 1 0 000 2h6.586l-1.293 1.293a1 1 0 000 1.414z"
                            />
                          </svg>
                        </button>
                      </div>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-zinc-500 font-medium">ADDRESS</span>
                          <button 
                            onClick={() => navigator.clipboard.writeText(account || '')}
                            className="text-zinc-500 hover:text-zinc-300 transition-colors p-1 rounded-lg hover:bg-zinc-800"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                              <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                              <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                            </svg>
                          </button>
                        </div>
                        <p className="text-sm text-green-50 font-medium">
                          {account?.split('').slice(0, 6).join('') + '...' + account?.split('').slice(-4).join('')}
                        </p>
                        {balance && (
                          <div className="pt-2 border-t border-zinc-800">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-zinc-500 font-medium">BALANCE</span>
                            </div>
                            <p className="text-sm text-green-50 font-medium mt-1">
                              {balance.format()} ETH
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                    {balance && balance.toNumber() === 0 && (
                      <a
                        href={`https://faucet-testnet.fuel.network/?address=${account}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block p-4 text-sm text-yellow-500 hover:bg-zinc-800 transition-colors border-t border-zinc-800 group"
                      >
                        <div className="flex items-center gap-2">
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 group-hover:rotate-12 transition-transform" viewBox="0 0 20 20" fill="currentColor">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"
                            />
                          </svg>
                          Get testnet funds
                        </div>
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Create Petition Form */}
            {showManageModal && (
              <div className="fixed inset-0 z-10 bg-black/50 flex items-center justify-center p-4">
                <div className="bg-zinc-900 rounded-2xl p-6 w-full max-w-md">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-white">Create New Petition</h2>
                    <button
                      onClick={() => setShowManageModal(false)}
                      className="text-zinc-400 hover:text-white"
                    >
                      <XCircleIcon className="w-6 h-6" />
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-zinc-400 mb-1">
                        Deadline
                      </label>
                      <input
                        type="datetime-local"
                        value={newCampaignDeadline}
                        onChange={(e) => setNewCampaignDeadline(e.target.value)}
                        className="w-full px-4 h-12 bg-zinc-800 rounded-xl text-white"
                      />
                    </div>
                    
                    <button
                      onClick={handleCreateCampaign}
                      disabled={loading || !newCampaignDeadline}
                      className="w-full h-12 bg-green-600 hover:bg-green-500 disabled:bg-green-900 
                               text-white font-medium rounded-xl transition-all"
                    >
                      {loading ? "Creating..." : "Create Petition"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Petitions Grid */}
          <div className="space-y-8">
            {/* Active Petitions */}
            <div>
              <h2 className="text-2xl font-bold text-green-50 px-2 mb-4">Active Petitions</h2>
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                {campaigns
                  .filter(campaign => campaign.state === 'Progress')
                  .map((campaign) => (
                    <div
                      key={campaign.id}
                      className="bg-zinc-900 rounded-xl p-6 space-y-4 border border-green-900/20"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-sm text-zinc-400">Petition #{campaign.id}</span>
                          <div className="flex items-center gap-2 mt-1">
                            <UsersIcon className="w-5 h-5 text-green-500" />
                            <span className="text-lg font-medium text-white">
                              {campaign.total_signs || 0} signatures
                            </span>
                          </div>
                        </div>
                        <div className={`px-3 py-1 rounded-full text-sm font-medium ${getStateStyle(campaign.state)}`}>
                          {campaign.state}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <ClockIcon className="w-5 h-5 text-zinc-400" />
                        <span className="text-zinc-300">
                          {formatDeadline(campaign.deadline)}
                        </span>
                      </div>

                      {/* Campaign Actions */}
                      <div className="flex items-center gap-2 mt-4">
                        {campaign.author.toLowerCase() === account?.toLowerCase() ? (
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-2">
                              {activeEditMenu === campaign.id ? (
                                <>
                                  <button
                                    onClick={() => handleCancelCampaign(campaign.id)}
                                    className="h-10 px-4 bg-red-600 hover:bg-red-500 text-white 
                                             rounded-lg transition-all flex items-center justify-center gap-2"
                                    disabled={loading}
                                  >
                                    <XIcon className="w-4 h-4" />
                                    Cancel
                                  </button>
                                  <button
                                    onClick={() => handleEndCampaign(campaign.id)}
                                    className="h-10 px-4 bg-yellow-600 hover:bg-yellow-500 text-white 
                                             rounded-lg transition-all flex items-center justify-center gap-2"
                                    disabled={loading}
                                  >
                                    <ClockIcon className="w-4 h-4" />
                                    End
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    onClick={() => handleSignPetition(campaign.id)}
                                    className="h-10 px-4 bg-green-600 hover:bg-green-500 text-white 
                                             rounded-lg transition-all flex items-center justify-center gap-2"
                                    disabled={loading}
                                  >
                                    <CheckIcon className="w-4 h-4" />
                                    Sign
                                  </button>
                                  <button
                                    onClick={() => handleUnsignPetition(campaign.id)}
                                    className="h-10 px-4 bg-zinc-800 hover:bg-zinc-700 text-white 
                                             rounded-lg transition-all flex items-center justify-center gap-2"
                                    disabled={loading}
                                  >
                                    <UndoIcon className="w-4 h-4" />
                                    Unsign
                                  </button>
                                </>
                              )}
                            </div>

                            <button
                              onClick={() => setActiveEditMenu(activeEditMenu === campaign.id ? null : campaign.id)}
                              className={`h-10 px-4 ${activeEditMenu === campaign.id ? 'border border-green-600 hover:bg-green-500' : 'bg-zinc-800 hover:bg-zinc-700'} text-white 
                                       rounded-lg transition-all flex items-center justify-center gap-2`}
                              disabled={loading}
                            >
                              <svg 
                                xmlns="http://www.w3.org/2000/svg" 
                                className={`w-4 h-4 ${activeEditMenu === campaign.id ? 'edit-icon-spin' : ''}`} 
                                viewBox="0 0 20 20" 
                                fill="none"
                                stroke="#ffffff"
                                strokeWidth="2"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"
                                />
                              </svg>
                              Edit
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleSignPetition(campaign.id)}
                              className="h-10 px-4 bg-green-600 hover:bg-green-500 text-white 
                                       rounded-lg transition-all flex items-center justify-center gap-2"
                              disabled={loading}
                            >
                              <CheckIcon className="w-4 h-4" />
                              Sign
                            </button>
                            <button
                              onClick={() => handleUnsignPetition(campaign.id)}
                              className="h-10 px-4 bg-zinc-800 hover:bg-zinc-700 text-white 
                                       rounded-lg transition-all flex items-center justify-center gap-2"
                              disabled={loading}
                            >
                              <UndoIcon className="w-4 h-4" />
                              Unsign
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Successful Petitions */}
            <div>
              <h2 className="text-2xl font-bold text-zinc-400 px-2 mb-4">Successful Petitions</h2>
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                {campaigns
                  .filter(campaign => campaign.state === 'Successful')
                  .map((campaign) => (
                    <div
                      key={campaign.id}
                      className="bg-zinc-900/50 rounded-xl p-6 space-y-4 border border-zinc-800"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-sm text-zinc-400">Petition #{campaign.id}</span>
                          <div className="flex items-center gap-2 mt-1">
                            <UsersIcon className="w-5 h-5 text-zinc-500" />
                            <span className="text-lg font-medium text-zinc-300">
                              {campaign.total_signs || 0} signatures
                            </span>
                          </div>
                        </div>
                        <div className={`px-3 py-1 rounded-full text-sm font-medium ${getStateStyle(campaign.state)}`}>
                          {campaign.state}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <ClockIcon className="w-5 h-5 text-zinc-500" />
                        <span className="text-zinc-400">
                          Ended
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Cancelled Petitions */}
            <div>
              <h2 className="text-2xl font-bold text-zinc-400 px-2 mb-4">Cancelled Petitions</h2>
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                {campaigns
                  .filter(campaign => campaign.state === 'Cancelled')
                  .map((campaign) => (
                    <div
                      key={campaign.id}
                      className="bg-zinc-900/50 rounded-xl p-6 space-y-4 border border-zinc-800"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-sm text-zinc-400">Petition #{campaign.id}</span>
                          <div className="flex items-center gap-2 mt-1">
                            <UsersIcon className="w-5 h-5 text-zinc-500" />
                            <span className="text-lg font-medium text-zinc-300">
                              {campaign.total_signs || 0} signatures
                            </span>
                          </div>
                        </div>
                        <div className={`px-3 py-1 rounded-full text-sm font-medium ${getStateStyle(campaign.state)}`}>
                          {campaign.state}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <ClockIcon className="w-5 h-5 text-zinc-500" />
                        <span className="text-zinc-400">
                          Cancelled
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
