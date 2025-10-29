

export default function InfoCards() {
    const info = [
        {
            1: {
                title: "Username",
                description: "John Doe"
            },
            2: {
                title: "Email",
                description: "johnd@gmail.com"
            }
        },
        {
            1: {
                title: "Old Password",
                description: ""
            },
            2: {
                title: "New Password",
                description: ""
            },
            3: {
                title: "Confirm Password",
                description: ""
            }
        },
        {
            1: {
                title: "Email Notification",
                description: "Switch"
            }
        },
        {
            1: {
                title: "Logout",
                description: ""
            }
        }
    ]

  return (
    <div>
        {info.map((card, index) => (
            <div key={index} className="bg-white rounded-xl px-4 py-2 mb-4">
                <div className={"flex flex-col"}>
                    {Object.values(card).map((item, idx) => 
                        item.title === "Logout" ? (
                            <button 
                                key={idx}
                                className={`flex justify-between w-full ${idx < Object.values(card).length - 1 ? 'border-b' : ''} py-2 rounded`}
                            >
                                <h3 className="sen-semibold text-secondary-light">Logout</h3>
                            </button>
                        ) : (
                            <div key={idx} className={`flex justify-between w-full ${idx < Object.values(card).length - 1 ? 'border-b' : ''} py-2 rounded`}>
                                <h3 
                                    className={`${item.title === "Email Notification" ? 'sen-regular' : 'sen-semibold'} ${item.title === "Logout" ? 'text-secondary-light' : ''}`}
                                >
                                    {item.title}
                                </h3>
                                {item.description === "Switch" ? (
                                    // <Switch
                                    //     checked={item.description === "On"}
                                    //     onChange={() => handleToggle(item.id)}
                                    // />
                                    <p className="sen-regular text-text-secondary">Switch</p>
                                ) : (
                                    <p className="sen-regular text-text-secondary">{item.description}</p>
                                )}
                            </div>
                        )
                    )}
                </div>
            </div>
        ))}
    </div>
  )
}
