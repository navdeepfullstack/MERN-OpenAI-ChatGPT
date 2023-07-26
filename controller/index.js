const { Configuration, OpenAIApi } = require("openai");

const chatGPT = async (req, res) => {
  let myuuid = v4();

  const category = req.body.category.trim();
  let firstletter = category.charAt(0);
  const remainingLetters = category.slice(1);
  const categoryName = firstletter.toUpperCase() + remainingLetters;
  const userId = req.body.userId;

  try {
    const template = await firebase.remoteConfig().getTemplate();

    const userUpadate = await firestore.collection("Users").doc(userId);
    const user = await userUpadate.get();
    if (!user.exists) {
      return res.json({ message: "User not found.", success: false });
    }
    // console.log(user.data());
    //     return
    if (user.data().coins <= 0) {
      return res.json({
        message: "You don't have enough coins for play this quiz.",
        success: false,
      });
    }
    const data = {
      lastQuizPlayAt: timestamp,
      // coins:
      //   user.data().coins <= 0
      //     ? 0
      //     : FieldValue.increment(
      //         -template.parameters.new_category_pick.defaultValue.value
      //       ),
    };
    await userUpadate.update(data);

    const categoryRef = await firestore
      .collection("Categories")
      .where("categoryName", "==", categoryName)
      .get();
    // const categorySnap = categoryRef;
    // console.log(categoryRef);
    let categoryDetails = {};
    categoryRef.forEach((doc) => {
      categoryDetails.id = doc.id;
      categoryDetails.details = doc.data();
    });
    // console.log(categoryDetails);
    if (categoryRef.empty) {
      const data = {
        categoryName: categoryName,
        status: "inActive",
        requiredPoints: 0,
        defaultCategory: true,
        coins: 10,
        icon: "",
        isQuestions: true,
        isUnlocked: false,
        createAt: timestamp,
        updatedAt: timestamp,
      };
      // await firestore.collection("Categories").doc().set(data);
      const newEntryCategoryRef = await firestore
        .collection("Categories")
        .where("categoryName", "==", categoryName)
        .get();
      let newCategoryAdd = {};
      newEntryCategoryRef.forEach((doc) => {
        newCategoryAdd.id = doc.id;
        newCategoryAdd.data = doc.data();
      });
      // console.log(newCategoryAdd);

      // Initialize the OpenAI API key
      const configuration = new Configuration({
        apiKey: process.env.OPEN_AI_KEY,
      });

      const openai = new OpenAIApi(configuration);
      // Define the prompt for the quiz question

      const prompt = `need questions in various categories with 7 values that are 1 category,
     1 question, 4 options and 1 correct answer in the format below.

    Generate me as many questions as you can from the ${req.body.category} category, some easy, some hard. answer should be in js array of object format.`;

      const completion = await openai.createCompletion({
        model: "text-davinci-003",
        prompt: prompt,
        max_tokens: 1100,
        temperature: 1,
        stop: "",
        // logit_bias: 1
      });
      const response = completion.data.choices[0].text.replace(
        /\r?\n|\r/g,
        " "
      );

      let arrStrTojson = JSON.parse(response);
      // arrStrTojson.forEach(async (doc) => {
      //   return await firestore.collection("DemoQuestion").doc().set(doc);
      // });

      let arrStr = JSON.parse(response);
      const convertedArr = arrStr.map((q) => {
        const options = [];

        for (let i = 1; i <= 4; i++) {
          options.push({
            id: `${q.category}${q.correct}${i}`,
            option: q[`option${i}`],
            questionBankId: q.category,
            isValid: q.correct === i,
          });
        }
        return {
          question: {
            id: `${q.category}${q.correct}`,
            categoryId: myuuid,
            question: q.question,
            answer: q[`option${q.correct}`],
            questionBankId: q.category,
          },
          options: options,
        };
      });

      res.json({ data: convertedArr, message: "Chat", success: true });
    }
  } catch (error) {
    console.log(error);
    res.status(400).json({ message: error.message, success: false });
  }
};

module.exports={
  chatGPT
}