
-- Скрипт для инициализации базы данных с 76 словами
-- Выполните этот скрипт в Supabase SQL Editor

-- Создаем таблицу для хранения начальных слов (если не существует)
CREATE TABLE IF NOT EXISTS initial_words (
  id SERIAL PRIMARY KEY,
  greek TEXT NOT NULL,
  translation TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  examples TEXT[] DEFAULT '{}',
  pronunciation TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Очищаем таблицу перед вставкой новых данных
TRUNCATE TABLE initial_words;

-- Вставляем 76 слов
INSERT INTO initial_words (greek, translation, tags, examples, pronunciation, notes) VALUES ('Καλημέρα', 'Доброе утро', '["greetings","basic"]', '["Καλημέρα! Πώς είσαι; - Доброе утро! Как дела?","Καλημέρα κύριε! - Доброе утро, господин!"]', 'кали-мЭ-ра', 'Используется до 12:00. После полудня говорят Καλησπέρα');
INSERT INTO initial_words (greek, translation, tags, examples, pronunciation, notes) VALUES ('Καλησπέρα', 'Добрый вечер', '["greetings","basic"]', '["Καλησπέρα! Πώς περνάς; - Добрый вечер! Как дела?","Καλησπέρα κύριε! - Добрый вечер, господин!"]', 'кали-спЭ-ра', 'Используется после 12:00. До полудня говорят Καλημέρα');
INSERT INTO initial_words (greek, translation, tags, examples, pronunciation, notes) VALUES ('Ευχαριστώ', 'Спасибо', '["greetings","basic"]', '["Ευχαριστώ πολύ! - Большое спасибо!","Ευχαριστώ για τη βοήθεια - Спасибо за помощь"]', 'эф-ха-рис-тО', 'Можно сократить до Ευχαριστώ πολύ (большое спасибо)');
INSERT INTO initial_words (greek, translation, tags, examples, pronunciation, notes) VALUES ('Παρακαλώ', 'Пожалуйста', '["greetings","basic"]', '["Παρακαλώ, καθίστε - Пожалуйста, садитесь","Παρακαλώ, μπορείτε να με βοηθήσετε; - Пожалуйста, можете помочь?"]', 'па-ра-ка-лО', 'Используется как ''пожалуйста'' и ''не за что''');
INSERT INTO initial_words (greek, translation, tags, examples, pronunciation, notes) VALUES ('Καληνύχτα', 'Спокойной ночи', '["greetings","basic"]', '["Καληνύχτα! - Спокойной ночи!","Καληνύχτα, αγάπη μου - Спокойной ночи, любовь моя"]', 'кали-нИ-хта', 'Используется при прощании на ночь');
INSERT INTO initial_words (greek, translation, tags, examples, pronunciation, notes) VALUES ('γεια', 'привет', '["greetings","basic"]', '["Γεια σου! - Привет тебе!","Γεια σας! - Привет вам! (вежливо)"]', 'йА', 'Неформальное приветствие');
INSERT INTO initial_words (greek, translation, tags, examples, pronunciation, notes) VALUES ('αντίο', 'до свидания', '["greetings","basic"]', '["Αντίο! - До свидания!","Αντίο, φίλε μου - До свидания, мой друг"]', 'ан-дИ-о', 'Формальное прощание');
INSERT INTO initial_words (greek, translation, tags, examples, pronunciation, notes) VALUES ('συγνώμη', 'извините', '["greetings","basic"]', '["Συγνώμη! - Извините!","Συγνώμη για την καθυστέρηση - Извините за опоздание"]', 'сиг-нО-ми', 'Используется для извинений');
INSERT INTO initial_words (greek, translation, tags, examples, pronunciation, notes) VALUES ('ναι', 'да', '["basic","words"]', '["Ναι, σας καταλαβαίνω - Да, я вас понимаю","Ναι, θέλω - Да, хочу"]', 'нэ', 'Положительный ответ');
INSERT INTO initial_words (greek, translation, tags, examples, pronunciation, notes) VALUES ('όχι', 'нет', '["basic","words"]', '["Όχι, δεν θέλω - Нет, не хочу","Όχι, ευχαριστώ - Нет, спасибо"]', 'О-хи', 'Отрицательный ответ');
INSERT INTO initial_words (greek, translation, tags, examples, pronunciation, notes) VALUES ('τρώω', 'есть (кушать)', '["verbs","food"]', '["Τρώω ψωμί - Я ем хлеб","Τι τρως; - Что ты ешь?","Δεν τρώω κρέας - Я не ем мясо"]', 'трО-о', 'Неправильный глагол. Спряжение: τρώω, τρως, τρώει, τρώμε, τρώτε, τρώνε');
INSERT INTO initial_words (greek, translation, tags, examples, pronunciation, notes) VALUES ('πίνω', 'пить', '["verbs","food"]', '["Πίνω νερό - Я пью воду","Τι πίνεις; - Что ты пьешь?","Πίνω καφέ - Я пью кофе"]', 'пИ-но', 'Правильный глагол');
INSERT INTO initial_words (greek, translation, tags, examples, pronunciation, notes) VALUES ('είμαι', 'быть (я есть)', '["verbs"]', '["Είμαι καλά - Я в порядке","Είμαι από την Ελλάδα - Я из Греции","Πώς είσαι; - Как дела?"]', 'И-мэ', 'Неправильный глагол. Спряжение: είμαι, είσαι, είναι, είμαστε, είστε, είναι');
INSERT INTO initial_words (greek, translation, tags, examples, pronunciation, notes) VALUES ('έχω', 'иметь (я имею)', '["verbs"]', '["Έχω ένα αυτοκίνητο - У меня есть машина","Έχεις χρόνο; - У тебя есть время?","Δεν έχω λεφτά - У меня нет денег"]', 'Э-хо', 'Неправильный глагол');
INSERT INTO initial_words (greek, translation, tags, examples, pronunciation, notes) VALUES ('θέλω', 'хотеть (я хочу)', '["verbs"]', '["Θέλω να πάω - Я хочу пойти","Τι θέλεις; - Что ты хочешь?","Θέλω νερό - Я хочу воды"]', 'тЭ-ло', 'Правильный глагол');
INSERT INTO initial_words (greek, translation, tags, examples, pronunciation, notes) VALUES ('αγαπώ', 'любить', '["verbs"]', '["Σε αγαπώ - Я тебя люблю","Αγαπώ την Ελλάδα - Я люблю Грецию","Αγαπώ τη μουσική - Я люблю музыку"]', 'а-га-пО', 'Правильный глагол');
INSERT INTO initial_words (greek, translation, tags, examples, pronunciation, notes) VALUES ('πηγαίνω', 'идти', '["verbs","movement"]', '["Πηγαίνω στο σπίτι - Я иду домой","Πού πας; - Куда ты идешь?","Πηγαίνουμε στην παραλία - Мы идем на пляж"]', 'пи-гЭ-но', 'Неправильный глагол');
INSERT INTO initial_words (greek, translation, tags, examples, pronunciation, notes) VALUES ('έρχομαι', 'приходить', '["verbs","movement"]', '["Έρχομαι από το γραφείο - Я прихожу с работы","Πότε έρχεσαι; - Когда ты придешь?","Έρχονται αύριο - Они приходят завтра"]', 'Э-рхо-мэ', 'Неправильный глагол');
INSERT INTO initial_words (greek, translation, tags, examples, pronunciation, notes) VALUES ('δουλεύω', 'работать', '["verbs","work"]', '["Δουλεύω σε ένα γραφείο - Я работаю в офисе","Πού δουλεύεις; - Где ты работаешь?","Δουλεύω πολύ - Я много работаю"]', 'ду-лЭ-во', 'Правильный глагол');
INSERT INTO initial_words (greek, translation, tags, examples, pronunciation, notes) VALUES ('μαθαίνω', 'учиться', '["verbs","education"]', '["Μαθαίνω ελληνικά - Я учу греческий","Τι μαθαίνεις; - Что ты изучаешь?","Μαθαίνω κάθε μέρα - Я учусь каждый день"]', 'ма-тЭ-но', 'Правильный глагол');
INSERT INTO initial_words (greek, translation, tags, examples, pronunciation, notes) VALUES ('μιλάω', 'говорить', '["verbs","communication"]', '["Μιλάω ελληνικά - Я говорю по-гречески","Μιλάς αγγλικά; - Ты говоришь по-английски?","Δεν μιλάω πολύ - Я не говорю много"]', 'ми-лА-о', 'Правильный глагол');
INSERT INTO initial_words (greek, translation, tags, examples, pronunciation, notes) VALUES ('βλέπω', 'видеть', '["verbs","senses"]', '["Βλέπω τη θάλασσα - Я вижу море","Τι βλέπεις; - Что ты видишь?","Δεν βλέπω καλά - Я плохо вижу"]', 'влЭ-по', 'Правильный глагол');
INSERT INTO initial_words (greek, translation, tags, examples, pronunciation, notes) VALUES ('ακούω', 'слышать', '["verbs","senses"]', '["Ακούω μουσική - Я слушаю музыку","Δεν ακούω - Я не слышу","Ακούω τη φωνή σου - Я слышу твой голос"]', 'а-кУ-о', 'Правильный глагол');
INSERT INTO initial_words (greek, translation, tags, examples, pronunciation, notes) VALUES ('κοιμάμαι', 'спать', '["verbs","daily"]', '["Κοιμάμαι 8 ώρες - Я сплю 8 часов","Πότε κοιμάσαι; - Когда ты спишь?","Κοιμάμαι νωρίς - Я рано ложусь спать"]', 'ки-мА-мэ', 'Неправильный глагол');
INSERT INTO initial_words (greek, translation, tags, examples, pronunciation, notes) VALUES ('ξυπνάω', 'просыпаться', '["verbs","daily"]', '["Ξυπνάω στις 7 - Я просыпаюсь в 7","Πότε ξυπνάς; - Когда ты просыпаешься?","Ξυπνάω νωρίς - Я рано просыпаюсь"]', 'кси-пнА-о', 'Правильный глагол');
INSERT INTO initial_words (greek, translation, tags, examples, pronunciation, notes) VALUES ('νερό', 'вода', '["food","drinks"]', '["Θέλω νερό - Я хочу воды","Το νερό είναι κρύο - Вода холодная","Πίνω νερό κάθε μέρα - Я пью воду каждый день"]', 'нэ-рО', 'Средний род');
INSERT INTO initial_words (greek, translation, tags, examples, pronunciation, notes) VALUES ('κρασί', 'вино', '["food","drinks"]', '["Πίνω κρασί - Я пью вино","Το κρασί είναι καλό - Вино хорошее","Κόκκινο κρασί - Красное вино"]', 'кра-сИ', 'Средний род');
INSERT INTO initial_words (greek, translation, tags, examples, pronunciation, notes) VALUES ('καφές', 'кофе', '["food","drinks"]', '["Πίνω καφέ - Я пью кофе","Θέλεις καφέ; - Хочешь кофе?","Ο καφές είναι ζεστός - Кофе горячий"]', 'ка-фЭс', 'Мужской род');
INSERT INTO initial_words (greek, translation, tags, examples, pronunciation, notes) VALUES ('τυρί', 'сыр', '["food"]', '["Τρώω τυρί - Я ем сыр","Το τυρί είναι αλμυρό - Сыр соленый","Φέτα τυρί - Сыр фета"]', 'ти-рИ', 'Средний род');
INSERT INTO initial_words (greek, translation, tags, examples, pronunciation, notes) VALUES ('ψωμί', 'хлеб', '["food"]', '["Τρώω ψωμί - Я ем хлеб","Το ψωμί είναι φρέσκο - Хлеб свежий","Λευκό ψωμί - Белый хлеб"]', 'псо-мИ', 'Средний род');
INSERT INTO initial_words (greek, translation, tags, examples, pronunciation, notes) VALUES ('κρέας', 'мясо', '["food"]', '["Τρώω κρέας - Я ем мясо","Το κρέας είναι νόστιμο - Мясо вкусное","Κοτόπουλο κρέας - Куриное мясо"]', 'крЭ-ас', 'Средний род');
INSERT INTO initial_words (greek, translation, tags, examples, pronunciation, notes) VALUES ('ψάρι', 'рыба', '["food"]', '["Τρώω ψάρι - Я ем рыбу","Το ψάρι είναι φρέσκο - Рыба свежая","Ψητό ψάρι - Жареная рыба"]', 'псА-ри', 'Средний род');
INSERT INTO initial_words (greek, translation, tags, examples, pronunciation, notes) VALUES ('φρούτα', 'фрукты', '["food"]', '["Τρώω φρούτα - Я ем фрукты","Τα φρούτα είναι γλυκά - Фрукты сладкие","Φρέσκα φρούτα - Свежие фрукты"]', 'фрУ-та', 'Средний род, множественное число');
INSERT INTO initial_words (greek, translation, tags, examples, pronunciation, notes) VALUES ('λαχανικά', 'овощи', '["food"]', '["Τρώω λαχανικά - Я ем овощи","Τα λαχανικά είναι υγιεινά - Овощи полезные","Φρέσκα λαχανικά - Свежие овощи"]', 'ла-ха-ни-кА', 'Средний род, множественное число');
INSERT INTO initial_words (greek, translation, tags, examples, pronunciation, notes) VALUES ('γλυκό', 'сладкое', '["food"]', '["Τρώω γλυκό - Я ем сладкое","Το γλυκό είναι νόστιμο - Сладкое вкусное","Ελληνικό γλυκό - Греческие сладости"]', 'гли-кО', 'Средний род');
INSERT INTO initial_words (greek, translation, tags, examples, pronunciation, notes) VALUES ('αλάτι', 'соль', '["food","spices"]', '["Βάζω αλάτι - Я добавляю соль","Το αλάτι είναι αλμυρό - Соль соленая","Λίγο αλάτι - Немного соли"]', 'а-лА-ти', 'Средний род');
INSERT INTO initial_words (greek, translation, tags, examples, pronunciation, notes) VALUES ('πιπέρι', 'перец', '["food","spices"]', '["Βάζω πιπέρι - Я добавляю перец","Το πιπέρι είναι καυτερό - Перец острый","Μαύρο πιπέρι - Черный перец"]', 'пи-пЭ-ри', 'Средний род');
INSERT INTO initial_words (greek, translation, tags, examples, pronunciation, notes) VALUES ('οικογένεια', 'семья', '["family","people"]', '["Η οικογένειά μου - Моя семья","Αγαπώ την οικογένειά μου - Я люблю свою семью","Μεγάλη οικογένεια - Большая семья"]', 'и-ко-гЭ-ни-а', 'Женский род');
INSERT INTO initial_words (greek, translation, tags, examples, pronunciation, notes) VALUES ('φίλος', 'друг', '["family","people"]', '["Ο φίλος μου - Мой друг","Έχω πολλούς φίλους - У меня много друзей","Καλός φίλος - Хороший друг"]', 'фИ-лос', 'Мужской род');
INSERT INTO initial_words (greek, translation, tags, examples, pronunciation, notes) VALUES ('φίλη', 'подруга', '["family","people"]', '["Η φίλη μου - Моя подруга","Έχω καλή φίλη - У меня есть хорошая подруга","Η καλύτερη φίλη - Лучшая подруга"]', 'фИ-ли', 'Женский род');
INSERT INTO initial_words (greek, translation, tags, examples, pronunciation, notes) VALUES ('πατέρας', 'отец', '["family","people"]', '["Ο πατέρας μου - Мой отец","Ο πατέρας δουλεύει - Отец работает","Αγαπώ τον πατέρα μου - Я люблю своего отца"]', 'па-тЭ-рас', 'Мужской род');
INSERT INTO initial_words (greek, translation, tags, examples, pronunciation, notes) VALUES ('μητέρα', 'мать', '["family","people"]', '["Η μητέρα μου - Моя мать","Η μητέρα μαγειρεύει - Мать готовит","Αγαπώ τη μητέρα μου - Я люблю свою мать"]', 'ми-тЭ-ра', 'Женский род');
INSERT INTO initial_words (greek, translation, tags, examples, pronunciation, notes) VALUES ('αδελφός', 'брат', '["family","people"]', '["Ο αδελφός μου - Мой брат","Έχω έναν αδελφό - У меня есть брат","Ο μεγάλος αδελφός - Старший брат"]', 'а-дел-фОс', 'Мужской род');
INSERT INTO initial_words (greek, translation, tags, examples, pronunciation, notes) VALUES ('αδελφή', 'сестра', '["family","people"]', '["Η αδελφή μου - Моя сестра","Έχω μια αδελφή - У меня есть сестра","Η μικρή αδελφή - Младшая сестра"]', 'а-дел-фИ', 'Женский род');
INSERT INTO initial_words (greek, translation, tags, examples, pronunciation, notes) VALUES ('παιδί', 'ребенок', '["family","people"]', '["Το παιδί μου - Мой ребенок","Έχω δύο παιδιά - У меня двое детей","Μικρό παιδί - Маленький ребенок"]', 'пэ-дИ', 'Средний род');
INSERT INTO initial_words (greek, translation, tags, examples, pronunciation, notes) VALUES ('σπίτι', 'дом', '["home","objects"]', '["Το σπίτι μου - Мой дом","Πηγαίνω στο σπίτι - Я иду домой","Μεγάλο σπίτι - Большой дом"]', 'спИ-ти', 'Средний род');
INSERT INTO initial_words (greek, translation, tags, examples, pronunciation, notes) VALUES ('δωμάτιο', 'комната', '["home","objects"]', '["Το δωμάτιό μου - Моя комната","Μεγάλο δωμάτιο - Большая комната","Καθαρό δωμάτιο - Чистая комната"]', 'до-мА-ти-о', 'Средний род');
INSERT INTO initial_words (greek, translation, tags, examples, pronunciation, notes) VALUES ('κρεβάτι', 'кровать', '["home","objects"]', '["Το κρεβάτι μου - Моя кровать","Κοιμάμαι στο κρεβάτι - Я сплю в кровати","Μεγάλο κρεβάτι - Большая кровать"]', 'крэ-вА-ти', 'Средний род');
INSERT INTO initial_words (greek, translation, tags, examples, pronunciation, notes) VALUES ('τραπέζι', 'стол', '["home","objects"]', '["Το τραπέζι - Стол","Τρώω στο τραπέζι - Я ем за столом","Μεγάλο τραπέζι - Большой стол"]', 'тра-пЭ-зи', 'Средний род');
INSERT INTO initial_words (greek, translation, tags, examples, pronunciation, notes) VALUES ('καρέκλα', 'стул', '["home","objects"]', '["Η καρέκλα - Стул","Καθίζω στην καρέκλα - Я сажусь на стул","Άνετη καρέκλα - Удобный стул"]', 'ка-рЭ-кла', 'Женский род');
INSERT INTO initial_words (greek, translation, tags, examples, pronunciation, notes) VALUES ('βιβλίο', 'книга', '["objects","education"]', '["Το βιβλίο μου - Моя книга","Διαβάζω βιβλίο - Я читаю книгу","Ενδιαφέρον βιβλίο - Интересная книга"]', 'ви-влИ-о', 'Средний род');
INSERT INTO initial_words (greek, translation, tags, examples, pronunciation, notes) VALUES ('χαρτί', 'бумага', '["objects","education"]', '["Το χαρτί - Бумага","Γράφω στο χαρτί - Я пишу на бумаге","Λευκό χαρτί - Белая бумага"]', 'хар-тИ', 'Средний род');
INSERT INTO initial_words (greek, translation, tags, examples, pronunciation, notes) VALUES ('στυλό', 'ручка', '["objects","education"]', '["Το στυλό μου - Моя ручка","Γράφω με στυλό - Я пишу ручкой","Μπλε στυλό - Синяя ручка"]', 'сти-лО', 'Средний род');
INSERT INTO initial_words (greek, translation, tags, examples, pronunciation, notes) VALUES ('τηλέφωνο', 'телефон', '["objects","technology"]', '["Το τηλέφωνό μου - Мой телефон","Παίρνω τηλέφωνο - Я звоню по телефону","Κινητό τηλέφωνο - Мобильный телефон"]', 'ти-лЭ-фо-но', 'Средний род');
INSERT INTO initial_words (greek, translation, tags, examples, pronunciation, notes) VALUES ('αυτοκίνητο', 'машина', '["objects","transport"]', '["Το αυτοκίνητό μου - Моя машина","Οδηγώ αυτοκίνητο - Я вожу машину","Κόκκινο αυτοκίνητο - Красная машина"]', 'аф-то-кИ-ни-то', 'Средний род');
INSERT INTO initial_words (greek, translation, tags, examples, pronunciation, notes) VALUES ('θάλασσα', 'море', '["nature","places"]', '["Η θάλασσα - Море","Πηγαίνω στην θάλασσα - Я иду к морю","Η θάλασσα είναι μπλε - Море синее"]', 'тА-ла-са', 'Женский род');
INSERT INTO initial_words (greek, translation, tags, examples, pronunciation, notes) VALUES ('βουνό', 'гора', '["nature","places"]', '["Το βουνό - Гора","Πηγαίνω στο βουνό - Я иду в горы","Υψηλό βουνό - Высокая гора"]', 'ву-нО', 'Средний род');
INSERT INTO initial_words (greek, translation, tags, examples, pronunciation, notes) VALUES ('δάσος', 'лес', '["nature","places"]', '["Το δάσος - Лес","Περπατάω στο δάσος - Я гуляю по лесу","Πυκνό δάσος - Густой лес"]', 'дА-сос', 'Средний род');
INSERT INTO initial_words (greek, translation, tags, examples, pronunciation, notes) VALUES ('ποτάμι', 'река', '["nature","places"]', '["Το ποτάμι - Река","Το ποτάμι ρέει - Река течет","Μεγάλο ποτάμι - Большая река"]', 'по-тА-ми', 'Средний род');
INSERT INTO initial_words (greek, translation, tags, examples, pronunciation, notes) VALUES ('ήλιος', 'солнце', '["nature","weather"]', '["Ο ήλιος - Солнце","Ο ήλιος λάμπει - Солнце светит","Καυτός ήλιος - Жаркое солнце"]', 'И-ли-ос', 'Мужской род');
INSERT INTO initial_words (greek, translation, tags, examples, pronunciation, notes) VALUES ('φεγγάρι', 'луна', '["nature","weather"]', '["Το φεγγάρι - Луна","Το φεγγάρι φαίνεται - Луна видна","Πανσέληνος - Полная луна"]', 'фэ-гА-ри', 'Средний род');
INSERT INTO initial_words (greek, translation, tags, examples, pronunciation, notes) VALUES ('αστέρι', 'звезда', '["nature","weather"]', '["Το αστέρι - Звезда","Τα αστέρια λάμπουν - Звезды светят","Φωτεινό αστέρι - Яркая звезда"]', 'а-стЭ-ри', 'Средний род');
INSERT INTO initial_words (greek, translation, tags, examples, pronunciation, notes) VALUES ('άνθρωπος', 'человек', '["nature","people"]', '["Ο άνθρωπος - Человек","Καλός άνθρωπος - Хороший человек","Όλοι οι άνθρωποι - Все люди"]', 'Ан-тро-пос', 'Мужской род');
INSERT INTO initial_words (greek, translation, tags, examples, pronunciation, notes) VALUES ('χρόνος', 'время', '["time","numbers"]', '["Ο χρόνος - Время","Δεν έχω χρόνο - У меня нет времени","Πολύς χρόνος - Много времени"]', 'хрО-нос', 'Мужской род');
INSERT INTO initial_words (greek, translation, tags, examples, pronunciation, notes) VALUES ('μέρα', 'день', '["time","numbers"]', '["Η μέρα - День","Καλή μέρα - Хорошего дня","Ολόκληρη μέρα - Целый день"]', 'мЭ-ра', 'Женский род');
INSERT INTO initial_words (greek, translation, tags, examples, pronunciation, notes) VALUES ('νύχτα', 'ночь', '["time","numbers"]', '["Η νύχτα - Ночь","Καληνύχτα - Спокойной ночи","Σκοτεινή νύχτα - Темная ночь"]', 'нИ-хта', 'Женский род');
INSERT INTO initial_words (greek, translation, tags, examples, pronunciation, notes) VALUES ('χρήματα', 'деньги', '["objects","basic"]', '["Έχω χρήματα - У меня есть деньги","Δεν έχω χρήματα - У меня нет денег","Πολλά χρήματα - Много денег"]', 'хрИ-ма-та', 'Средний род, множественное число');
INSERT INTO initial_words (greek, translation, tags, examples, pronunciation, notes) VALUES ('ρούχα', 'одежда', '["objects","daily"]', '["Τα ρούχά μου - Моя одежда","Φοράω ρούχα - Я ношу одежду","Καθαρά ρούχα - Чистая одежда"]', 'рУ-ха', 'Средний род, множественное число');
INSERT INTO initial_words (greek, translation, tags, examples, pronunciation, notes) VALUES ('ποδήλατο', 'велосипед', '["objects","transport"]', '["Το ποδήλατό μου - Мой велосипед","Οδηγώ ποδήλατο - Я езжу на велосипеде","Κόκκινο ποδήλατο - Красный велосипед"]', 'по-дИ-ла-то', 'Средний род');
INSERT INTO initial_words (greek, translation, tags, examples, pronunciation, notes) VALUES ('αεροπλάνο', 'самолет', '["objects","transport"]', '["Το αεροπλάνο - Самолет","Πετάω με αεροπλάνο - Я летаю на самолете","Μεγάλο αεροπλάνο - Большой самолет"]', 'а-э-ро-плА-но', 'Средний род');
INSERT INTO initial_words (greek, translation, tags, examples, pronunciation, notes) VALUES ('αγόρι', 'мальчик', '["people","family"]', '["Το αγόρι - Мальчик","Μικρό αγόρι - Маленький мальчик","Το αγόρι παίζει - Мальчик играет"]', 'а-гО-ри', 'Средний род');
INSERT INTO initial_words (greek, translation, tags, examples, pronunciation, notes) VALUES ('κορίτσι', 'девочка', '["people","family"]', '["Το κορίτσι - Девочка","Μικρό κορίτσι - Маленькая девочка","Το κορίτσι διαβάζει - Девочка читает"]', 'ко-рИ-ци', 'Средний род');
INSERT INTO initial_words (greek, translation, tags, examples, pronunciation, notes) VALUES ('γάτα', 'кошка', '["animals","pets"]', '["Η γάτα - Кошка","Η γάτα μου - Моя кошка","Μικρή γάτα - Маленькая кошка"]', 'гА-та', 'Женский род');
INSERT INTO initial_words (greek, translation, tags, examples, pronunciation, notes) VALUES ('σκύλος', 'собака', '["animals","pets"]', '["Ο σκύλος - Собака","Ο σκύλος μου - Моя собака","Μεγάλος σκύλος - Большая собака"]', 'скИ-лос', 'Мужской род');
INSERT INTO initial_words (greek, translation, tags, examples, pronunciation, notes) VALUES ('μουσική', 'музыка', '["entertainment","culture"]', '["Η μουσική - Музыка","Ακούω μουσική - Я слушаю музыку","Καλή μουσική - Хорошая музыка"]', 'му-си-кИ', 'Женский род');
INSERT INTO initial_words (greek, translation, tags, examples, pronunciation, notes) VALUES ('ταινία', 'фильм', '["entertainment","culture"]', '["Η ταινία - Фильм","Βλέπω ταινία - Я смотрю фильм","Καλή ταινία - Хороший фильм"]', 'тэ-нИ-а', 'Женский род');

-- Создаем функцию для инициализации слов пользователя
CREATE OR REPLACE FUNCTION init_user_words(user_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Вставляем все начальные слова для пользователя
  INSERT INTO cards (user_id, greek, translation, tags, status, reps, lapses, ease, interval_days, due, correct, incorrect, examples, pronunciation, notes)
  SELECT 
    user_id,
    iw.greek,
    iw.translation,
    iw.tags,
    'new'::card_status,
    0,
    0,
    2.5,
    0,
    NOW(),
    0,
    0,
    iw.examples,
    iw.pronunciation,
    iw.notes
  FROM initial_words iw
  WHERE NOT EXISTS (
    SELECT 1 FROM cards c 
    WHERE c.user_id = init_user_words.user_id 
    AND c.greek = iw.greek 
    AND c.translation = iw.translation
  );
END;
$$ LANGUAGE plpgsql;

-- Создаем триггер для автоматической инициализации слов при создании пользователя
CREATE OR REPLACE FUNCTION trigger_init_user_words()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM init_user_words(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Создаем триггер (если не существует)
DROP TRIGGER IF EXISTS init_words_on_user_create ON auth.users;
CREATE TRIGGER init_words_on_user_create
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION trigger_init_user_words();

-- Инициализируем слова для существующих пользователей
-- Замените 'USER_ID_1' и 'USER_ID_2' на реальные ID пользователей Pavel и Aleksandra
-- SELECT init_user_words('USER_ID_1'::UUID);
-- SELECT init_user_words('USER_ID_2'::UUID);

COMMIT;
