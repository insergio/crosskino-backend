async function index(req, res) {

    let {
        query: {
            user = "",
            list = ""
        }
    } = req;

    try {

        return res.status(200).send(
            "success"
        );
    } catch (error) {
        console.error(error);
        return res.status(500).send({ message: error.message });
    }
}

module.exports = {
    index
};
