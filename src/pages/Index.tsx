import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Gift, Users, Star, Clock, Target, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/hooks/useTranslation";
import Header from "@/components/Header";
import OffersSection from "@/components/OffersSection";
import SocialMediaSection from "@/components/SocialMediaSection";
import SocialMediaModal from "@/components/SocialMediaModal";
import WinnersList from "@/components/WinnersList";
import ParticipationModal from "@/components/ParticipationModal";
import ParticipationSuccessModal from "@/components/ParticipationSuccessModal";
import TransparencyModal from "@/components/TransparencyModal";
import UserParticipationStatus from "@/components/UserParticipationStatus";
import Footer from "@/components/Footer";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchDraws } from "@/store/slices/drawsSlice";
import type { Draw } from "@/store/slices/drawsSlice";

// firebase imports
import { firestore } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";

const Index = () => {
  const [selectedPrize, setSelectedPrize] = useState<Draw | null>(null);
  const [showSocialModal, setShowSocialModal] = useState(false);
  const [showParticipationModal, setShowParticipationModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showTransparencyModal, setShowTransparencyModal] = useState(false);
  const [participantEmail, setParticipantEmail] = useState("");

  const { t, changeLanguage } = useTranslation();
  const { toast } = useToast();
  const dispatch = useAppDispatch();
  const { draws, loading } = useAppSelector((state) => state.draws);

  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);

  const success = params.get("success");
  const prizeId = params.get("prizeId");
  const prizeName = params.get("prizeName");
  const email = params.get("email");

  // جلب السحوبات
  useEffect(() => {
    dispatch(fetchDraws());
  }, [dispatch]);

  // ✅ معالجة نجاح المشاركة بعد الرجوع من اللينك الخارجي
  useEffect(() => {
    const handleSuccess = async () => {
      if (success === "true" && prizeId) {
        let finalEmail = email || localStorage.getItem("currentUserEmail") || "";

        if (!finalEmail) {
          setShowSuccessModal(true);
          return;
        }

        setParticipantEmail(finalEmail);
        setShowSuccessModal(true);

        try {
          const prizeRef = doc(firestore, "draws", prizeId as string);
          const snap = await getDoc(prizeRef);

          if (snap.exists()) {
            const data = snap.data();
            const currentRemaining = data.remainingParticipants ?? data.maxParticipants ?? 0;
            const participants: string[] = data.participants || [];

            if (!participants.includes(finalEmail)) {
              await updateDoc(prizeRef, {
                remainingParticipants: Math.max(currentRemaining - 1, 0),
                participants: [...participants, finalEmail],
              });
            }
          }

          localStorage.setItem("currentUserEmail", finalEmail);
        } catch (err) {
          console.error("❌ Error updating participants:", err);
        }

        params.delete("success");
        const newUrl = `${window.location.pathname}?${params.toString()}`;
        window.history.replaceState({}, "", newUrl);
      }
    };

    handleSuccess();
  }, [success, prizeId, email]);

  // ✅ عند الضغط على جائزة
  const handlePrizeClick = (draw: Draw) => {
    const participantsCount = draw.participants?.length || 0;
    const max = draw.maxParticipants || 0;

    if (max > 0 && participantsCount >= max) {
      toast({
        title: "السحب مكتمل",
        description: "لقد اكتمل العدد المطلوب لهذا السحب",
        variant: "destructive",
      });
      return;
    }

    setSelectedPrize(draw);
    setShowParticipationModal(true);
  };

  // ✅ المشاركة: توجيه للينك الخارجي
  const handleParticipation = (email: string) => {
    if (selectedPrize) {
      localStorage.setItem("currentUserEmail", email);

      if (selectedPrize.offerUrl) {
        window.location.href = `${selectedPrize.offerUrl}?prizeId=${selectedPrize.id}&email=${encodeURIComponent(email)}&success=true&prizeName=${encodeURIComponent(selectedPrize.name)}`;
      } else {
        toast({
          title: "لا يوجد لينك عرض",
          description: "من فضلك تواصل مع الإدارة",
          variant: "destructive",
        });
      }
    }
  };

  const handleSuccessModalContinue = () => {
    setShowSuccessModal(false);
    setTimeout(() => {
      setShowSocialModal(true);
    }, 500);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <Header onLanguageChange={changeLanguage} />

      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative z-10 container mx-auto px-4 py-16">
          <div className="text-center text-white">
            <div className="inline-flex items-center bg-yellow-500/20 backdrop-blur-sm rounded-full px-6 py-2 mb-6">
              <Trophy className="w-5 h-5 mr-2 text-yellow-400" />
              <span className="text-yellow-300 font-semibold">{t("site.subtitle")}</span>
            </div>

            <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
              {t("site.title")}
            </h1>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4">
        <UserParticipationStatus />

        {/* Current Prizes */}
        <div className="py-16">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-white mb-4">{t("prizes.availableNow")}</h2>
            <p className="text-xl text-gray-300">{t("prizes.chooseToParticipate")}</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
            {loading && <p className="text-white text-center">جارِ التحميل...</p>}

            {!loading &&
              draws
                .filter((draw) => draw.status === "active")
                .map((draw) => {
                  const participantsCount = draw.participants?.length || 0;
                  const max = draw.maxParticipants || 0;

                  return (
                    <Card
                      key={draw.id}
                      className="bg-white/10 backdrop-blur-sm border-white/20 hover:bg-white/20 transition-all duration-300 hover:scale-105"
                    >
                      <CardHeader className="text-center">
                        <div className="text-6xl mb-4">🎁</div>
                        <CardTitle className="text-white">{draw.name}</CardTitle>
                        <CardDescription className="text-green-400 text-2xl font-bold">
                          {draw.prize || "جائزة"} - ${draw.prizeValue || 0}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="flex items-center justify-between text-gray-300">
                            <span>{t("prizes.participantsRemaining")}:</span>
                            <Badge variant="secondary">{max - participantsCount}</Badge>
                          </div>

                          <div className="w-full bg-gray-700 rounded-full h-2">
                            <div
                              className="bg-gradient-to-r from-green-500 to-blue-500 h-2 rounded-full transition-all duration-300"
                              style={{
                                width: `${(participantsCount / (max || 1)) * 100}%`,
                              }}
                            ></div>
                          </div>

                          <Button
                            onClick={() => handlePrizeClick(draw)}
                            disabled={draw.status !== "active"}
                            className="w-full mt-4 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Target className="w-4 h-4 mr-2" />
                            {draw.status !== "active"
                              ? t("button.completed")
                              : t("button.participateInDraw")}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
          </div>
        </div>
      </div>

      <SocialMediaSection />
      <OffersSection />
      <WinnersList />

      <ParticipationModal
        isOpen={showParticipationModal}
        onClose={() => setShowParticipationModal(false)}
        prize={selectedPrize}
        onParticipate={handleParticipation}
      />

      <ParticipationSuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        onContinueToSocial={handleSuccessModalContinue}
        email={participantEmail}
        prizeName={(prizeName as string) || selectedPrize?.name || ""}
      />

      <SocialMediaModal isOpen={showSocialModal} onClose={() => setShowSocialModal(false)} />

      <TransparencyModal
        isOpen={showTransparencyModal}
        onClose={() => setShowTransparencyModal(false)}
      />

      <Footer />
    </div>
  );
};

export default Index;
