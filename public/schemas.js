/**
 * schemas.js
 * -----------------------------------------------------------------------
 * Декларативное описание всех редактируемых таблиц мода Alem.
 * app.js по каждой схеме сам строит форму добавления строки и таблицу
 * уже добавленных строк — переопределять HTML не нужно.
 *
 * Типы полей:
 *   text      — обычная строка
 *   number    — число (пусто = поле не задано и не попадёт в JSON)
 *   checkbox  — булево, попадает в JSON только если true
 *   select    — выпадающий список ({value,label}); пустое значение = не задано
 *   color     — HEX-цвет
 *   textarea  — многострочный текст (для desc и т.п.)
 *   json      — многострочный текст, парсится как JSON (для "more"/"extra"/"unlocks")
 *   list      — строка через запятую → массив строк (для prereq и т.п.)
 * -----------------------------------------------------------------------
 */

const SCHEMAS = {

  // ---------------------------------------------------------------- WEAPONS
  weapons: {
    title: 'оружие',
    keyField: 'id',
    itemLabel: it => `${it.name || it.id} ${it.id ? `· ${it.id}` : ''}`,
    fields: [
      { name: 'id', label: 'id (ключ)', type: 'text', required: true, placeholder: 'kylysh', hint: 'Латиницей, уникально' },
      { name: 'name', label: 'Название', type: 'text', placeholder: 'Кылыш' },
      { name: 'spriteId', label: 'spriteId', type: 'text', hint: 'Чья картинка используется, если своей нет' },
      { name: 'melee', label: 'Ближний бой', type: 'checkbox' },
      { name: 'family', label: 'Семейство материалов', type: 'checkbox', hint: 'Породит варианты по materials' },
      { name: 'handOnly', label: 'Только в руках (без предмета)', type: 'checkbox' },
      { name: 'dmg', label: 'Урон', type: 'number', step: '1' },
      { name: 'interval', label: 'Интервал, сек', type: 'number', step: '0.1' },
      { name: 'range', label: 'Дальность', type: 'number', step: '0.1' },
      { name: 'accMul', label: 'Множитель точности', type: 'number', step: '0.01' },
      { name: 'pen', label: 'Пробитие брони (0…1)', type: 'number', step: '0.01', min: 0, max: 1 },
      { name: 'burst', label: 'Выстрелов в очереди', type: 'number', step: '1' },
      { name: 'burstCd', label: 'Пауза внутри очереди', type: 'number', step: '0.01' },
      { name: 'dtype', label: 'Тип урона', type: 'select', options: [
        { value: '', label: '— по умолчанию (Sharp) —' },
        { value: 'Sharp', label: 'Sharp · режущий' },
        { value: 'Blunt', label: 'Blunt · дробящий' },
        { value: 'Heat', label: 'Heat · ожог' },
      ] },
      { name: 'hitLabel', label: 'Название удара', type: 'text', placeholder: 'Удар кылышем' },
      { name: 'drawScale', label: 'Размер картинки', type: 'number', step: '0.01' },
      { name: 'spriteAngle', label: 'Поворот картинки, °', type: 'number', step: '1' },
      { name: 'cost1Type', label: 'Материал 1: тип', type: 'text' },
      { name: 'cost1', label: 'Материал 1: кол-во', type: 'number', step: '1' },
      { name: 'cost2Type', label: 'Материал 2: тип', type: 'text' },
      { name: 'cost2', label: 'Материал 2: кол-во', type: 'number', step: '1' },
      { name: 'craftWork', label: 'Работа на изготовление', type: 'number', step: '1' },
      { name: 'more', label: 'Доп. ингредиенты (JSON)', type: 'json', placeholder: '[{"res":"Rivets","count":4}]', wide: true },
    ],
  },

  materials: {
    title: 'материалы клинков',
    keyField: 'key',
    itemLabel: it => it.key || '(без key)',
    fields: [
      { name: 'key', label: 'key', type: 'select', required: true, options: [
        { value: '', label: '— выберите —' },
        { value: 'wood', label: 'wood · дерево' },
        { value: 'lime', label: 'lime · известняк' },
        { value: 'gran', label: 'gran · гранит' },
        { value: 'iron', label: 'iron · железо' },
        { value: 'bronze', label: 'bronze · бронза' },
        { value: 'steel', label: 'steel · сталь' },
      ] },
      { name: 'name', label: 'Название варианта', type: 'text', placeholder: 'железный' },
      { name: 'dmgMul', label: 'Множитель урона', type: 'number', step: '0.01' },
      { name: 'res', label: 'Ресурс', type: 'text', placeholder: 'Iron' },
      { name: 'amount', label: 'Кол-во ресурса', type: 'number', step: '1' },
    ],
  },

  // ---------------------------------------------------------------- APPAREL
  apparel: {
    title: 'одежду',
    keyField: 'id',
    itemLabel: it => `${it.name || it.id} ${it.id ? `· ${it.id}` : ''}`,
    fields: [
      { name: 'id', label: 'id (ключ)', type: 'text', required: true, placeholder: 'steppecoat' },
      { name: 'name', label: 'Название', type: 'text', placeholder: 'Степной кафтан' },
      { name: 'slot', label: 'Слот', type: 'select', options: [
        { value: '', label: '— по умолчанию (Torso) —' },
        { value: 'Head', label: 'Head · голова' },
        { value: 'Torso', label: 'Torso · тело' },
        { value: 'TorsoOver', label: 'TorsoOver · поверх тела' },
        { value: 'Legs', label: 'Legs · ноги' },
        { value: 'ArmorOver', label: 'ArmorOver · доспех поверх всего' },
      ] },
      { name: 'armorSharp', label: 'Броня: режущий (0…1)', type: 'number', step: '0.01' },
      { name: 'armorBlunt', label: 'Броня: дробящий (0…1)', type: 'number', step: '0.01' },
      { name: 'armorHeat', label: 'Броня: ожог (0…1)', type: 'number', step: '0.01' },
      { name: 'insCold', label: 'Утепление (холод)', type: 'number', step: '1' },
      { name: 'insHeat', label: 'Защита от жары', type: 'number', step: '1' },
      { name: 'maxHp', label: 'Прочность', type: 'number', step: '1' },
      { name: 'look', label: 'Номер картинки слоя (look)', type: 'number', step: '1' },
      { name: 'matType', label: 'Материал пошива', type: 'text', placeholder: 'Leather' },
      { name: 'matCost', label: 'Кол-во материала', type: 'number', step: '1' },
      { name: 'waterproof', label: 'Защита от намокания (0…1)', type: 'number', step: '0.01' },
      { name: 'tendBonus', label: 'Бонус к лечению', type: 'number', step: '0.01' },
      { name: 'colorful', label: 'Красится игроком при пошиве', type: 'checkbox' },
      { name: 'coversFace', label: 'Закрывает лицо (скрывает бороду)', type: 'checkbox' },
      { name: 'tint', label: 'Постоянный цвет', type: 'color' },
      { name: 'more', label: 'Доп. материалы (JSON)', type: 'json', placeholder: '[{"res":"Rivets","count":6}]', wide: true },
    ],
  },

  // -------------------------------------------------------------- RESOURCES
  resources: {
    title: 'ресурс',
    keyField: 'id',
    itemLabel: it => `${it.name || it.id} ${it.id ? `· ${it.id}` : ''}`,
    fields: [
      { name: 'id', label: 'id (ключ)', type: 'text', required: true, placeholder: 'Mithril', hint: 'С заглавной буквы' },
      { name: 'name', label: 'Название (рус.)', type: 'text', placeholder: 'Мифрил' },
      { name: 'nameEn', label: 'Название (англ.)', type: 'text', placeholder: 'Mithril' },
      { name: 'weight', label: 'Вес единицы', type: 'number', step: '0.01' },
      { name: 'value', label: 'Цена', type: 'number', step: '1' },
      { name: 'nutrition', label: 'Сытость (для еды)', type: 'number', step: '0.01' },
      { name: 'icon', label: 'Путь к картинке', type: 'text', placeholder: 'Items/mithril' },
      { name: 'shape', label: 'Форма заглушки', type: 'select', options: [
        { value: '', label: '— по умолчанию (nugget) —' },
        { value: 'ingot', label: 'ingot' }, { value: 'bar', label: 'bar' },
        { value: 'powder', label: 'powder' }, { value: 'vial', label: 'vial' },
        { value: 'coin', label: 'coin' }, { value: 'meat', label: 'meat' },
        { value: 'grain', label: 'grain' }, { value: 'tuber', label: 'tuber' },
        { value: 'cloth', label: 'cloth' }, { value: 'herb', label: 'herb' },
        { value: 'gem', label: 'gem' }, { value: 'nugget', label: 'nugget' },
      ] },
      { name: 'color', label: 'Цвет заглушки', type: 'color' },
      { name: 'mineral', label: 'Признак: минерал', type: 'checkbox' },
      { name: 'currency', label: 'Признак: валюта', type: 'checkbox' },
      { name: 'flammable', label: 'Признак: горючий', type: 'checkbox' },
      { name: 'bloodPack', label: 'Признак: пакет крови', type: 'checkbox' },
      { name: 'organ', label: 'Признак: орган', type: 'checkbox' },
      { name: 'implant', label: 'Признак: имплант', type: 'checkbox' },
      { name: 'bionic', label: 'Признак: бионика', type: 'checkbox' },
      { name: 'meal', label: 'Признак: готовое блюдо', type: 'checkbox' },
      { name: 'animalProduce', label: 'Признак: продукт животных', type: 'checkbox' },
      { name: 'plantFood', label: 'Признак: растительная еда', type: 'checkbox' },
      { name: 'meat', label: 'Признак: мясо', type: 'checkbox' },
      { name: 'fodder', label: 'Признак: корм', type: 'checkbox' },
      { name: 'food', label: 'Признак: еда', type: 'checkbox' },
    ],
  },

  // ---------------------------------------------------------------- RECIPES
  recipes: {
    title: 'рецепт',
    keyField: 'id',
    itemLabel: it => `${it.name || it.id} ${it.station ? `· ${it.station}` : ''}`,
    fields: [
      { name: 'station', label: 'Станок', type: 'select', required: true, options: [
        { value: '', label: '— выберите —' },
        { value: 'campfire', label: 'campfire · костёр' },
        { value: 'cook', label: 'cook · кухонная плита' },
        { value: 'butcher', label: 'butcher · разделочный стол' },
        { value: 'furnace', label: 'furnace · плавильная печь' },
        { value: 'steel', label: 'steel · сталеплавильная печь' },
        { value: 'stonecut', label: 'stonecut · камнерезный стол' },
        { value: 'chem', label: 'chem · химический стол' },
        { value: 'tailor', label: 'tailor · швейный стол' },
        { value: 'craft', label: 'craft · верстак' },
      ] },
      { name: 'id', label: 'id (ключ рецепта)', type: 'text', required: true, placeholder: 'mithril_ingot' },
      { name: 'name', label: 'Название заказа', type: 'text', placeholder: 'Выплавить мифрил' },
      { name: 'in1Type', label: 'Ингредиент 1: тип', type: 'text', placeholder: 'SilverOre' },
      { name: 'in1', label: 'Ингредиент 1: кол-во', type: 'number', step: '1' },
      { name: 'in1Group', label: 'Ингредиент 1: группа', type: 'select', numeric: true, options: [
        { value: '', label: '— точный тип —' },
        { value: '0', label: '0 · точный тип' },
        { value: '1', label: '1 · любое мясо' },
        { value: '2', label: '2 · любая растительная еда' },
      ] },
      { name: 'in2Type', label: 'Ингредиент 2: тип', type: 'text', placeholder: 'Coal' },
      { name: 'in2', label: 'Ингредиент 2: кол-во', type: 'number', step: '1' },
      { name: 'in2Group', label: 'Ингредиент 2: группа', type: 'select', numeric: true, options: [
        { value: '', label: '— точный тип —' },
        { value: '0', label: '0 · точный тип' },
        { value: '1', label: '1 · любое мясо' },
        { value: '2', label: '2 · любая растительная еда' },
      ] },
      { name: 'outType', label: 'Результат: тип', type: 'text', placeholder: 'Mithril' },
      { name: 'outCount', label: 'Результат: кол-во', type: 'number', step: '1' },
      { name: 'outType2', label: 'Побочный продукт: тип', type: 'text' },
      { name: 'outCount2', label: 'Побочный продукт: кол-во', type: 'number', step: '1' },
      { name: 'work', label: 'Работа на порцию', type: 'number', step: '1' },
      { name: 'weaponId', label: 'Делает оружие с id', type: 'text' },
      { name: 'apparelId', label: 'Шьёт одежду с id', type: 'text' },
      { name: 'colorPick', label: 'Показать выбор цвета', type: 'checkbox' },
      { name: 'medicinePool', label: 'Берёт лекарства из общего пула', type: 'checkbox' },
      { name: 'more', label: 'Доп. ингредиенты (JSON)', type: 'json', placeholder: '[{"type":"Cloth","count":2}]', wide: true },
    ],
  },

  // ------------------------------------------------------------- BUILDINGS
  buildings: {
    title: 'постройку',
    keyField: 'kind',
    itemLabel: it => `${it.kind}${it.variant ? ' · ' + it.variant : ''}`,
    fields: [
      { name: 'kind', label: 'kind (вид постройки)', type: 'text', required: true, placeholder: 'Wall', hint: 'Имя должно быть игровым' },
      { name: 'variant', label: 'variant (если есть)', type: 'text' },
      { name: 'costType', label: 'Материал', type: 'text' },
      { name: 'costAmount', label: 'Кол-во материала', type: 'number', step: '1' },
      { name: 'work', label: 'Секунд работы', type: 'number', step: '1' },
      { name: 'hp', label: 'Прочность', type: 'number', step: '1' },
      { name: 'extra', label: 'Доп. компоненты (JSON)', type: 'json', placeholder: '[{"res":"SteelMechanism","count":2}]', wide: true },
    ],
  },

  // ----------------------------------------------------------------- TECHS
  techs: {
    title: 'технологию',
    keyField: 'id',
    itemLabel: it => `${it.name || it.id} ${it.id ? `· ${it.id}` : ''}`,
    fields: [
      { name: 'id', label: 'id (ключ)', type: 'text', required: true, placeholder: 'steppe_smithing' },
      { name: 'name', label: 'Название', type: 'text', placeholder: 'Степная ковка' },
      { name: 'branch', label: 'Ветка', type: 'text', placeholder: 'Ремёсла' },
      { name: 'era', label: 'Эпоха', type: 'select', numeric: true, options: [
        { value: '', label: '— по умолчанию (1) —' },
        { value: '1', label: '1 · ремёсла' },
        { value: '2', label: '2 · железо' },
        { value: '3', label: '3 · порох' },
        { value: '4', label: '4 · сталь' },
        { value: '5', label: '5 · пар и электричество' },
      ] },
      { name: 'cost', label: 'Стоимость (очки исследования)', type: 'number', step: '1' },
      { name: 'desc', label: 'Описание', type: 'textarea', wide: true },
      { name: 'needAdvanced', label: 'Нужен продвинутый стол исследований', type: 'checkbox' },
      { name: 'prereq', label: 'Требует техов (через запятую)', type: 'list', placeholder: 'craft_smithy, iron_working', wide: true },
      { name: 'unlocks', label: 'Открывает ключи (через запятую)', type: 'list', placeholder: 'weaponfam:kylysh@iron, apparel:steppecoat, recipe:mithril_ingot', wide: true,
        hint: 'building: · recipe: · weapon: · weaponfam:x@mat · apparel: · bed: · wallmat: · power: · siege: · crop: · mech:' },
    ],
  },

  // ----------------------------------------------------------------- PAWNS
  traits: {
    title: 'черту',
    keyField: 'name',
    itemLabel: it => it.name,
    fields: [
      { name: 'name', label: 'Название черты', type: 'text', required: true, placeholder: 'Степняк' },
      { name: 'desc', label: 'Описание', type: 'textarea', wide: true, placeholder: 'Вырос в седле: ходит на 10% быстрее.' },
      { name: 'blocks', label: 'Запрещённая работа', type: 'text', placeholder: 'Уборка' },
    ],
  },

  traitPairs: {
    title: 'пару черт',
    keyField: 'a',
    itemLabel: it => `${it.a} ↔ ${it.b}`,
    fields: [
      { name: 'a', label: 'Черта A', type: 'text', required: true },
      { name: 'b', label: 'Черта B', type: 'text', required: true },
    ],
  },

  childhoods: {
    title: 'детскую биографию',
    keyField: 'name',
    itemLabel: it => it.name,
    fields: [
      { name: 'name', label: 'Название', type: 'text', required: true },
      { name: 'bonus', label: 'Бонусы к навыкам (JSON)', type: 'json', placeholder: '{"Melee":2,"Social":1}', wide: true },
      { name: 'blocks', label: 'Закрытые работы (через запятую)', type: 'list', wide: true },
    ],
  },

  adulthoods: {
    title: 'взрослую биографию',
    keyField: 'name',
    itemLabel: it => it.name,
    fields: [
      { name: 'name', label: 'Название', type: 'text', required: true },
      { name: 'bonus', label: 'Бонусы к навыкам (JSON)', type: 'json', placeholder: '{"Melee":4}', wide: true },
      { name: 'blocks', label: 'Закрытые работы (через запятую)', type: 'list', wide: true },
    ],
  },

  rareFullfirst: {
    title: 'редкую пару имени',
    keyField: 'first',
    itemLabel: it => `${it.first} ${it.last}`,
    fields: [
      { name: 'first', label: 'Имя', type: 'text', required: true },
      { name: 'last', label: 'Фамилия', type: 'text', required: true },
    ],
  },

  // ------------------------------------------------------------------- LOC
  loc: {
    title: 'перевод',
    keyField: 'ru',
    itemLabel: it => `${it.ru} → ${it.en}`,
    fields: [
      { name: 'ru', label: 'Русская строка (ключ)', type: 'text', required: true, placeholder: 'Кылыш', hint: 'Символ в символ, как в таблицах' },
      { name: 'en', label: 'Перевод', type: 'text', required: true, placeholder: 'Kylysh' },
    ],
  },

};

// Простые списки строк (имена персонажей) — отдельная, более лёгкая форма.
const NAME_LISTS = [
  { key: 'maleNames', label: 'Мужские имена' },
  { key: 'femaleNames', label: 'Женские имена' },
  { key: 'lastNames', label: 'Фамилии' },
  { key: 'nicknames', label: 'Клички' },
  { key: 'rareMale', label: 'Редкие мужские имена' },
  { key: 'rareFemale', label: 'Редкие женские имена' },
  { key: 'chronic', label: 'Хронические болячки' },
];

/**
 * Автопривязка к технологиям.
 * Для схем ниже в форме появляется блок «Открыть в технологиях»:
 * можно сразу добавить ключ доступа в уже существующий тех или создать
 * новый — вручную лазить в вкладку «Технологии» после этого не нужно.
 * Функция возвращает список ключей unlocks, которые нужно вписать технологии.
 */
SCHEMAS.weapons.techLink = (item, materials) => {
  if (item.family) {
    const mats = (materials || []).filter(m => m.key);
    if (!mats.length) return [`weapon:${item.id}`];
    return mats.map(m => `weaponfam:${item.id}@${m.key}`);
  }
  return [`weapon:${item.id}`];
};

SCHEMAS.apparel.techLink = (item) => [`apparel:${item.id}`];

SCHEMAS.recipes.techLink = (item) => [`recipe:${item.id}`];

/**
 * Номера look, которые в слоях Head / Torso / TorsoOver / ArmorOver уже
 * заняты встроенными вещами игры (см. раздел про облик колониста) —
 * свои номера должны начинаться после них. Для Legs игра ничего не
 * резервирует, поэтому там можно начинать с 0.
 */
const LOOK_RESERVED_START = {
  Head: 3, Torso: 3, TorsoOver: 3, ArmorOver: 3, Legs: 0,
};

/**
 * Черновые стартовые характеристики по типу оружия — не «правильный»
 * баланс, а просто разумная точка отсчёта, чтобы не гадать, что писать
 * в dmg/interval/range/drawScale. Пример кылыша и значения ножа/копья
 * из инструкции взяты как есть, остальное — по аналогии.
 */
const WEAPON_TEMPLATES = {
  knife:  { melee: true, dmg: 9,  interval: 1.6, range: 1.4, drawScale: 0.55, dtype: 'Sharp', craftWork: 2, hitLabel: 'Удар ножом' },
  sword:  { melee: true, dmg: 14, interval: 1.8, range: 1.5, drawScale: 0.9,  dtype: 'Sharp', craftWork: 5, hitLabel: 'Удар мечом' },
  spear:  { melee: true, dmg: 12, interval: 2.0, range: 1.9, drawScale: 0.88, dtype: 'Sharp', craftWork: 5, hitLabel: 'Удар копьём' },
  mace:   { melee: true, dmg: 16, interval: 2.2, range: 1.4, drawScale: 0.8,  dtype: 'Blunt', craftWork: 5, hitLabel: 'Удар дубиной' },
  bow:    { melee: false, dmg: 10, interval: 2.0, range: 18, drawScale: 1.0, dtype: 'Sharp', craftWork: 6, hitLabel: 'Попадание стрелой' },
  pistol: { melee: false, dmg: 9,  interval: 1.2, range: 15, accMul: 0.9, drawScale: 0.6, dtype: 'Sharp', craftWork: 6, hitLabel: 'Попадание пулей' },
  rifle:  { melee: false, dmg: 15, interval: 1.9, range: 26, accMul: 1.1, drawScale: 1.1, dtype: 'Sharp', craftWork: 9, hitLabel: 'Попадание пулей' },
};

const WEAPON_TEMPLATE_OPTIONS = [
  { value: '', label: '— без шаблона —' },
  { value: 'knife', label: 'Нож' },
  { value: 'sword', label: 'Меч' },
  { value: 'spear', label: 'Копьё' },
  { value: 'mace', label: 'Дубина / булава' },
  { value: 'bow', label: 'Лук' },
  { value: 'pistol', label: 'Пистолет' },
  { value: 'rifle', label: 'Ружьё / винтовка' },
];

