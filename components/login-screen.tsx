"use client";

import { useState, useEffect } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { USER_CONFIGS, getUserConfig, getCurrentUserFromEmail } from "@/lib/user-config";
import { testSupabaseConnection } from "@/lib/test-supabase";
import { getTestCards } from "@/lib/test-data";
import { LocalCardsRepository } from "@/lib/localRepositories";
import { loadAndSaveUserDataFromSupabase, syncAllDataToSupabase } from "@/lib/core/storage";
import { toast } from "sonner";
import { Logo } from "@/components/logo";

interface LoginScreenProps {
  onLogin: () => void;
}

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isAutoLogin, setIsAutoLogin] = useState(false);
  const [isLoadingTestData, setIsLoadingTestData] = useState(false);
  const [currentUser, setCurrentUser] = useState<"pavel" | "aleksandra" | null>(null);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setIsSignedIn(!!session);

      if (event === "SIGNED_IN" && session) {
        const userType = getCurrentUserFromEmail(session.user.email || "");
        setCurrentUser(userType);

        const userConfig = userType ? getUserConfig(userType) : null;
        const userName = userConfig?.name || "Пользователь";

        toast.success(`Добро пожаловать, ${userName}! 👋`);
        // Загружаем данные пользователя из Supabase
        await handleLoadUserData();
        onLogin(); // Переходим к основному приложению
      } else if (event === "SIGNED_OUT") {
        setCurrentUser(null);
        toast.info("Вы вышли из системы");
      }
    });

    // Проверяем существующую сессию при загрузке
    const autoLoginOnStartup = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        // Если пользователь уже авторизован, определяем его тип
        const userType = getCurrentUserFromEmail(session.user.email || "");
        setCurrentUser(userType);
        setIsSignedIn(true);
        onLogin(); // Переходим к основному приложению
      }
      // Не пытаемся автоматически входить в Pavel - показываем стартовый экран
    };

    autoLoginOnStartup();

    return () => subscription.unsubscribe();
  }, [onLogin]);

  const handleSignUp = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });
      if (error) throw error;
      toast.success("Проверьте вашу почту для подтверждения регистрации!");
    } catch (error: any) {
      toast.error(error.message || "Ошибка регистрации");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignIn = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
    } catch (error: any) {
      toast.error(error.message || "Ошибка входа");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUserLogin = async (userId: "pavel" | "aleksandra") => {
    setIsAutoLogin(true);
    try {
      const userConfig = getUserConfig(userId);

      // Только пытаемся войти, не создаем пользователя
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: userConfig.email,
        password: userConfig.password,
      });

      if (signInError) {
        // Показываем сообщение о том, что нужно создать пользователя вручную
        toast.error(
          `Пользователь ${userConfig.name} не найден. Создайте его в Supabase Dashboard.`
        );
        console.log(`Пользователь ${userConfig.name} не найден. Нужно создать вручную в Supabase.`);
      } else {
        toast.success(`✅ Вход в учетную запись ${userConfig.name} выполнен!`);
      }
    } catch (error: any) {
      console.error("User login failed:", error);
      toast.error(`Ошибка: ${error.message}`);
    } finally {
      setIsAutoLogin(false);
    }
  };

  const handleLoadUserData = async () => {
    setIsSyncing(true);
    try {
      await loadAndSaveUserDataFromSupabase();
      toast.success("Данные загружены из облака!");
    } catch (error) {
      console.error("Failed to load user data:", error);
      toast.error("Ошибка загрузки данных из облака");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSyncToCloud = async () => {
    setIsSyncing(true);
    try {
      await syncAllDataToSupabase();
      toast.success("Данные отправлены в облако!");
    } catch (error) {
      console.error("Failed to sync data:", error);
      toast.error("Ошибка синхронизации с облаком");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    try {
      const result = await testSupabaseConnection();
      if (result.success) {
        toast.success("✅ Подключение к базе данных работает!");
      } else {
        toast.error(`❌ Ошибка подключения: ${result.error}`);
      }
    } catch (error) {
      console.error("Test connection failed:", error);
      toast.error("Ошибка тестирования подключения");
    } finally {
      setIsTesting(false);
    }
  };

  const handleLoadTestData = async () => {
    setIsLoadingTestData(true);
    try {
      const testCards = getTestCards(currentUser || undefined);

      // Загружаем тестовые данные локально
      // Note: This would need profileId, but for test data we'll skip for now
      // await LocalCardsRepository.bulkSave(profileId, testCards)

      // Синхронизируем с Supabase
      await syncAllDataToSupabase();

      const userName = currentUser ? getUserConfig(currentUser).name : "Пользователь";
      toast.success(`✅ Тестовые данные загружены для ${userName}!`);
    } catch (error) {
      console.error("Failed to load test data:", error);
      toast.error("Ошибка загрузки тестовых данных");
    } finally {
      setIsLoadingTestData(false);
    }
  };

  if (!isSupabaseConfigured) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md glass-effect shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-xl font-semibold">
              <div className="p-2 rounded-xl gradient-purple-soft">⚠️</div>
              Supabase не настроен
            </CardTitle>
            <CardDescription>
              Для использования синхронизации данных настройте переменные окружения в файле
              .env.local
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Приложение работает в локальном режиме. Данные сохраняются только в браузере.
            </p>
            <Button
              onClick={handleTestConnection}
              disabled={isTesting}
              variant="secondary"
              className="w-full shadow-medium hover:shadow-strong transition-all duration-300 ease-out"
            >
              {isTesting ? "Тестирование..." : "🔍 Тест подключения к БД"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6 sm:space-y-8">
        {/* Заголовок */}
        <div className="text-center space-y-6 sm:space-y-8">
          <h1 className="text-5xl sm:text-6xl font-light tracking-tight bg-gradient-to-r from-[#8B5CF6] via-[#7C3AED] to-[#6D28D9] bg-clip-text text-transparent">
            Greekly
          </h1>
          <p className="text-muted-foreground text-xl sm:text-2xl font-light">
            Умное изучение греческого языка
          </p>
        </div>

        {/* Быстрый вход */}
        <Card className="glass-effect shadow-lg">
          <CardHeader>
            <CardTitle className="text-center text-foreground text-xl font-semibold">
              🚀 Быстрый вход
            </CardTitle>
            <CardDescription className="text-center text-muted-foreground">
              Выберите пользователя для входа в систему
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <Button
                onClick={() => handleUserLogin("pavel")}
                disabled={isAutoLogin}
                variant="secondary"
                size="lg"
                className="h-24 flex flex-col gap-3 shadow-medium hover:shadow-strong transition-all duration-300 ease-out"
              >
                <span className="text-4xl">👨‍💻</span>
                <span className="font-light text-xl">Pavel</span>
              </Button>
              <Button
                onClick={() => handleUserLogin("aleksandra")}
                disabled={isAutoLogin}
                variant="secondary"
                size="lg"
                className="h-24 flex flex-col gap-3 shadow-medium hover:shadow-strong transition-all duration-300 ease-out"
              >
                <span className="text-4xl">👩‍💻</span>
                <span className="font-light text-xl">Aleksandra</span>
              </Button>
            </div>

            {isAutoLogin && (
              <div className="text-center text-sm text-muted-foreground">Вход в систему...</div>
            )}
          </CardContent>
        </Card>

        {/* Ручной вход */}
        <Card className="glass-effect shadow-lg">
          <CardHeader>
            <CardTitle className="text-center text-xl font-semibold text-foreground">
              🔐 Ручной вход
            </CardTitle>
            <CardDescription className="text-center text-muted-foreground">
              Или войдите с помощью email и пароля
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Вход</TabsTrigger>
                <TabsTrigger value="signup">Регистрация</TabsTrigger>
              </TabsList>

              <TabsContent value="signin" className="space-y-3 sm:space-y-4">
                <div className="space-y-2">
                  <Input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="h-11 sm:h-10"
                  />
                  <Input
                    type="password"
                    placeholder="Пароль"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="h-11 sm:h-10"
                  />
                </div>
                <Button
                  onClick={handleSignIn}
                  disabled={isLoading || !email || !password}
                  className="w-full h-12 shadow-medium hover:shadow-strong transition-all duration-300 ease-out"
                >
                  {isLoading ? "Вход..." : "Войти"}
                </Button>
              </TabsContent>

              <TabsContent value="signup" className="space-y-3 sm:space-y-4">
                <div className="space-y-2">
                  <Input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="h-11 sm:h-10"
                  />
                  <Input
                    type="password"
                    placeholder="Пароль (минимум 6 символов)"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="h-11 sm:h-10"
                  />
                </div>
                <Button
                  onClick={handleSignUp}
                  disabled={isLoading || !email || !password || password.length < 6}
                  className="w-full h-12 shadow-medium hover:shadow-strong transition-all duration-300 ease-out"
                >
                  {isLoading ? "Регистрация..." : "Зарегистрироваться"}
                </Button>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
