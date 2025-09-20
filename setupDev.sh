# !/bin/bash
apt install unzip git curl -y
curl -fsSL https://bun.sh/install | bash
# install nodejs
curl -fsSL https://deb.nodesource.com/setup_24.x | bash -
apt install -y nodejs
# install python3 and pip
apt install -y python3 python3-pip
# install typescript and ts-node
# ask for git config user.name and user.email
name=$(git config --global user.name)
email=$(git config --global user.email)
if [ -z "$name" ]; then
  read -p "Enter your git user.name: " name
  git config --global user.name "$name"
fi
if [ -z "$email" ]; then
  read -p "Enter your git user.email: " email
  git config --global user.email "$email"
fi
git clone https://github.com/kosmixyt/jspanel /workspace