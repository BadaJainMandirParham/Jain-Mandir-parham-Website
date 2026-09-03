export type CommitteeMember = {
  id: string;
  app_id?: string;
  name: string;
  position: string;
  image_url: string;
  public_id: string;
  phone: string;
  display_order: number;
};

export const permanentCommitteeMembers: CommitteeMember[] = [
  {
    id: "6a64f30b557dbcfe182dc122",
    app_id: "6a64f30b557dbcfe182dc122",
    name: "Jaychandra Jain",
    position: "Manager",
    image_url: "https://res.cloudinary.com/dhmw4b5wq/image/upload/v1779339785/temple/committee/fx3qqawbqvoz7kkju6eo.jpg",
    public_id: "temple/committee/fx3qqawbqvoz7kkju6eo",
    phone: "999999999",
    display_order: 1,
  },
  {
    id: "6a64f37f557dbcfe182dc12a",
    name: "Sanjay Jain",
    position: "Chairman",
    image_url: "https://res.cloudinary.com/dhmw4b5wq/image/upload/v1779339937/temple/committee/my61wum4i8fz9uxexkzy.jpg",
    public_id: "temple/committee/my61wum4i8fz9uxexkzy",
    phone: "9719366609",
    display_order: 2,
  },
  {
    id: "6a64f417557dbcfe182dc13e",
    app_id: "6a64f417557dbcfe182dc13e",
    name: "Reetsh Jain",
    position: "General Secratary",
    image_url: "https://res.cloudinary.com/dhmw4b5wq/image/upload/v1779340020/temple/committee/dbphc75p0og6n9tssupz.jpg",
    public_id: "temple/committee/dbphc75p0og6n9tssupz",
    phone: "8392996171",
    display_order: 3,
  },
  {
    id: "6a64f50711f07418564ef3cc",
    app_id: "6a64f50711f07418564ef3cc",
    name: "Lalit Jain",
    position: "Secretary",
    image_url: "https://res.cloudinary.com/dhmw4b5wq/image/upload/v1779340426/temple/committee/avrj0kq4osefpek7nwn9.jpg",
    public_id: "temple/committee/avrj0kq4osefpek7nwn9",
    phone: "9568804188",
    display_order: 4,
  },
  {
    id: "6a64f6258b3066c956431b79",
    app_id: "6a64f6258b3066c956431b79",
    name: "Shashank Jain",
    position: "Treasurer",
    image_url: "https://res.cloudinary.com/dhmw4b5wq/image/upload/v1779340613/temple/committee/uyszimvcdjeux57rpbqt.jpg",
    public_id: "temple/committee/uyszimvcdjeux57rpbqt",
    phone: "8474923279",
    display_order: 5,
  },
  {
    id: "6a64f7563ad26eb6ffff2036",
    app_id: "6a64f7563ad26eb6ffff2036",
    name: "Viral Jain",
    position: "Vice Chairman",
    image_url: "https://res.cloudinary.com/dhmw4b5wq/image/upload/v1779340739/temple/committee/kldonu9lxjz1pxb6ls7f.jpg",
    public_id: "temple/committee/kldonu9lxjz1pxb6ls7f",
    phone: "9536352927",
    display_order: 6,
  },
  {
    id: "6a64f7cb3ad26eb6ffff2046",
    name: "Arpan Jain",
    position: "Media Incharge",
    image_url: "https://res.cloudinary.com/dhmw4b5wq/image/upload/v1779340786/temple/committee/kmcx3b8gainnvgbt5xes.jpg",
    public_id: "temple/committee/kmcx3b8gainnvgbt5xes",
    phone: "6399003541",
    display_order: 7,
  },
];

const normalizeKey = (value: string) => value.trim().toLowerCase().replace(/\s+/g, " ");

export const mergeCommitteeMembers = (apiMembers: any[] = []) => {
  const merged = new Map<string, any>();

  permanentCommitteeMembers.forEach((member) => {
    merged.set(member.id, member);
  });

  apiMembers.forEach((member, index) => {
    const id = String(member.id || member.app_id || member._id || "");
    const fallbackKey = `${normalizeKey(member.name || "")}:${normalizeKey(member.position || "")}`;
    const existing = [...merged.values()].find((item) => (
      (id && String(item.id) === id) ||
      (id && String(item.app_id || "") === id) ||
      (member.app_id && String(item.id) === String(member.app_id)) ||
      `${normalizeKey(item.name || "")}:${normalizeKey(item.position || "")}` === fallbackKey
    ));

    if (existing) {
      merged.set(String(existing.id), { ...existing, ...member, id: existing.id });
      return;
    }

    merged.set(id || `api-${index}`, { ...member, id: id || `api-${index}`, display_order: member.display_order ?? 100 + index });
  });

  return [...merged.values()].sort((a, b) => Number(a.display_order ?? 999) - Number(b.display_order ?? 999));
};
