import { db } from "../config/database";
import { type Contact, type LinkPrecedence } from "../models/contact.model";

type CreateContactInput = {
  email: string | null;
  phoneNumber: string | null;
  linkedId: number | null;
  linkPrecedence: LinkPrecedence;
  createdAt?: string;
  updatedAt?: string;
};

const selectColumns =
  "id, phoneNumber, email, linkedId, linkPrecedence, createdAt, updatedAt, deletedAt";

const initializeTable = (): void => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS Contact (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phoneNumber TEXT,
      email TEXT,
      linkedId INTEGER,
      linkPrecedence TEXT NOT NULL CHECK(linkPrecedence IN ('primary', 'secondary')),
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      deletedAt TEXT,
      FOREIGN KEY(linkedId) REFERENCES Contact(id)
    );
    CREATE INDEX IF NOT EXISTS idx_contact_email ON Contact(email);
    CREATE INDEX IF NOT EXISTS idx_contact_phoneNumber ON Contact(phoneNumber);
    CREATE INDEX IF NOT EXISTS idx_contact_linkedId ON Contact(linkedId);
  `);
};

initializeTable();

const findById = (id: number): Contact | null => {
  const row = db
    .prepare(`SELECT ${selectColumns} FROM Contact WHERE id = ?`)
    .get(id) as Contact | undefined;

  return row ?? null;
};

const findFirstByEmail = (email: string): Contact | null => {
  const row = db
    .prepare(`SELECT ${selectColumns} FROM Contact WHERE email = ?`)
    .get(email) as Contact | undefined;

  return row ?? null;
};

const findMatches = (input: {
  email: string | null;
  phoneNumber: string | null;
}): Contact[] => {
  const filters: string[] = [];
  const params: string[] = [];

  if (input.email) {
    filters.push("email = ?");
    params.push(input.email);
  }

  if (input.phoneNumber) {
    filters.push("phoneNumber = ?");
    params.push(input.phoneNumber);
  }

  if (filters.length === 0) {
    return [];
  }

  return db
    .prepare(`
      SELECT ${selectColumns}
      FROM Contact
      WHERE deletedAt IS NULL
        AND (${filters.join(" OR ")})
    `)
    .all(...params) as Contact[];
};

const findContactsByRelationIds = (relationIds: number[]): Contact[] => {
  if (relationIds.length === 0) {
    return [];
  }

  const placeholders = relationIds.map(() => "?").join(", ");

  return db
    .prepare(`
      SELECT ${selectColumns}
      FROM Contact
      WHERE deletedAt IS NULL
        AND (id IN (${placeholders}) OR linkedId IN (${placeholders}))
    `)
    .all(...relationIds, ...relationIds) as Contact[];
};

const createContact = (input: CreateContactInput): Contact => {
  const now = input.createdAt ?? new Date().toISOString();
  const updatedAt = input.updatedAt ?? now;
  const result = db
    .prepare(`
      INSERT INTO Contact (phoneNumber, email, linkedId, linkPrecedence, createdAt, updatedAt, deletedAt)
      VALUES (?, ?, ?, ?, ?, ?, NULL)
    `)
    .run(input.phoneNumber, input.email, input.linkedId, input.linkPrecedence, now, updatedAt);

  const created = findById(Number(result.lastInsertRowid));

  if (!created) {
    throw new Error("Failed to load created contact.");
  }

  return created;
};

const reassignChildrenToPrimary = (fromPrimaryIds: number[], toPrimaryId: number): void => {
  if (fromPrimaryIds.length === 0) {
    return;
  }

  const placeholders = fromPrimaryIds.map(() => "?").join(", ");
  const now = new Date().toISOString();

  db.prepare(`
      UPDATE Contact
      SET linkedId = ?, updatedAt = ?
      WHERE linkedId IN (${placeholders})
    `).run(toPrimaryId, now, ...fromPrimaryIds);
};

const convertPrimariesToSecondaries = (primaryIds: number[], toPrimaryId: number): void => {
  if (primaryIds.length === 0) {
    return;
  }

  const placeholders = primaryIds.map(() => "?").join(", ");
  const now = new Date().toISOString();

  db.prepare(`
      UPDATE Contact
      SET linkedId = ?, linkPrecedence = 'secondary', updatedAt = ?
      WHERE id IN (${placeholders})
    `).run(toPrimaryId, now, ...primaryIds);
};

const runInTransaction = <T>(work: () => T): T => {
  const transaction = db.transaction(work);
  return transaction();
};

const resetContacts = (): void => {
  db.prepare("DELETE FROM Contact").run();
  db.prepare("DELETE FROM sqlite_sequence WHERE name = 'Contact'").run();
};

export const contactRepository = {
  createContact,
  convertPrimariesToSecondaries,
  findContactsByRelationIds,
  findFirstByEmail,
  findById,
  findMatches,
  reassignChildrenToPrimary,
  resetContacts,
  runInTransaction,
};
