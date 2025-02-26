const userVerify = (req, res, next) => {
    // req.user jest brany z access token po zalogowaniu lub zrobieniu refresh token
    // rozkodowany wygląda na przykład tak:
    // {
    //     "sub": 14, 
    //     "email": "nehal@example.com",
    //     "iat": 1736849525,
    //     "exp": 1736853125
    // }
    // req.user.sub to nasze id (w tym przypadku 14)
    const currentUser = req.user.sub;
    // req.params.id jest brany z endpointu np: .../user/users/14
    const targetUserId = parseInt(req.params.id);

    if (currentUser !== targetUserId) {
        return res.status(403).json({ error: 'You do not have permission to perform this operation.' });
    }

    next();
};

module.exports = { userVerify };