
export default function LineAddFriendButton() {

  return (
    <div className="w-full h-auto my-8 py-3 px-6 relative rounded-[10px] bg-white shadow-[0px_4px_10px_0px_rgba(0,0,0,0.20)]">
        <div className=" flex items-center justify-between">
            <div className="flex justify-start text-sm font-normal sen-regular text-text-secondary">
                Receive Alert
            </div>
            <a
                href="https://lin.ee/x55326p"
                target="_blank"
                rel="noopener noreferrer"
                className="flex text-right justify-end text-sm sen-semibold text-text-secondary"
            >
                <img
                    src="https://scdn.line-apps.com/n/line_add_friends/btn/en.png"
                    alt="Add friend"
                    className="h-10 object-contain"
                />
            </a>
        </div>
    </div>
  );
}