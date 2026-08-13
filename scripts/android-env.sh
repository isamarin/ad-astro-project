# Source before local Android builds:
#   source scripts/android-env.sh
#
# Requires: JDK 17, Android SDK + NDK 28.

export JAVA_HOME="${JAVA_HOME:-/opt/homebrew/opt/openjdk@17}"
export ANDROID_HOME="${ANDROID_HOME:-$HOME/Library/Android/sdk}"

if [ -d "$ANDROID_HOME/ndk/28.2.13676358" ]; then
  export NDK_HOME="$ANDROID_HOME/ndk/28.2.13676358"
elif [ -d "$ANDROID_HOME/ndk" ]; then
  export NDK_HOME="$ANDROID_HOME/ndk/$(ls -1 "$ANDROID_HOME/ndk" | tail -1)"
fi

export PATH="$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/cmdline-tools/latest/bin:$PATH"

echo "JAVA_HOME=$JAVA_HOME"
echo "ANDROID_HOME=$ANDROID_HOME"
echo "NDK_HOME=${NDK_HOME:-unset}"
