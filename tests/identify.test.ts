import request from "supertest";

import { app } from "../src/app";
import { closeDatabase } from "../src/config/database";
import { LINK_PRECEDENCE } from "../src/models/contact.model";
import { contactRepository } from "../src/repositories/contact.repository";

describe("POST /identify", () => {
  beforeEach(() => {
    contactRepository.resetContacts();
  });

  afterAll(() => {
    closeDatabase();
  });

  it("creates a new primary contact when there is no match", async () => {
    const response = await request(app).post("/identify").send({
      email: "doc@hillvalley.edu",
      phoneNumber: "111222",
    });

    expect(response.status).toBe(200);
    expect(response.body.contact.primaryContatctId).toBe(1);
    expect(response.body.contact.emails).toEqual(["doc@hillvalley.edu"]);
    expect(response.body.contact.phoneNumbers).toEqual(["111222"]);
    expect(response.body.contact.secondaryContactIds).toEqual([]);
  });

  it("creates a secondary contact when new info arrives for an existing user", async () => {
    const primaryId = contactRepository.createContact({
      email: "lorraine@hillvalley.edu",
      phoneNumber: "123456",
      linkedId: null,
      linkPrecedence: LINK_PRECEDENCE.PRIMARY,
      createdAt: "2023-04-01T00:00:00.374Z",
    }).id;

    const response = await request(app).post("/identify").send({
      email: "mcfly@hillvalley.edu",
      phoneNumber: "123456",
    });

    expect(response.status).toBe(200);
    expect(response.body.contact.primaryContatctId).toBe(primaryId);
    expect(response.body.contact.emails).toEqual([
      "lorraine@hillvalley.edu",
      "mcfly@hillvalley.edu",
    ]);
    expect(response.body.contact.phoneNumbers).toEqual(["123456"]);
    expect(response.body.contact.secondaryContactIds).toHaveLength(1);

    const createdSecondary = contactRepository.findFirstByEmail("mcfly@hillvalley.edu");

    expect(createdSecondary).not.toBeNull();
    expect(createdSecondary?.linkedId).toBe(primaryId);
    expect(createdSecondary?.linkPrecedence).toBe(LINK_PRECEDENCE.SECONDARY);
    expect(response.body.contact.secondaryContactIds).toContain(createdSecondary?.id);
  });

  it("returns the same contact for PDF null-identifier variants", async () => {
    const initial = await request(app).post("/identify").send({
      email: "lorraine@hillvalley.edu",
      phoneNumber: "123456",
    });

    const withNewEmail = await request(app).post("/identify").send({
      email: "mcfly@hillvalley.edu",
      phoneNumber: "123456",
    });

    const byPhoneOnly = await request(app).post("/identify").send({
      email: null,
      phoneNumber: "123456",
    });
    const byPrimaryEmailOnly = await request(app).post("/identify").send({
      email: "lorraine@hillvalley.edu",
      phoneNumber: null,
    });
    const bySecondaryEmailOnly = await request(app).post("/identify").send({
      email: "mcfly@hillvalley.edu",
      phoneNumber: null,
    });

    expect(initial.status).toBe(200);
    expect(withNewEmail.status).toBe(200);
    expect(byPhoneOnly.status).toBe(200);
    expect(byPrimaryEmailOnly.status).toBe(200);
    expect(bySecondaryEmailOnly.status).toBe(200);

    const expectedContact = {
      primaryContatctId: 1,
      emails: ["lorraine@hillvalley.edu", "mcfly@hillvalley.edu"],
      phoneNumbers: ["123456"],
      secondaryContactIds: [2],
    };

    expect(byPhoneOnly.body.contact).toEqual(expectedContact);
    expect(byPrimaryEmailOnly.body.contact).toEqual(expectedContact);
    expect(bySecondaryEmailOnly.body.contact).toEqual(expectedContact);
  });

  it("merges two primary clusters and keeps the oldest primary", async () => {
    const oldestPrimaryId = contactRepository.createContact({
      email: "george@hillvalley.edu",
      phoneNumber: "919191",
      linkedId: null,
      linkPrecedence: LINK_PRECEDENCE.PRIMARY,
      createdAt: "2023-04-11T00:00:00.374Z",
    }).id;

    const newerPrimaryId = contactRepository.createContact({
      email: "biffsucks@hillvalley.edu",
      phoneNumber: "717171",
      linkedId: null,
      linkPrecedence: LINK_PRECEDENCE.PRIMARY,
      createdAt: "2023-04-21T05:30:00.110Z",
    }).id;

    const response = await request(app).post("/identify").send({
      email: "george@hillvalley.edu",
      phoneNumber: "717171",
    });

    expect(response.status).toBe(200);
    expect(response.body.contact.primaryContatctId).toBe(oldestPrimaryId);
    expect(response.body.contact.emails).toEqual([
      "george@hillvalley.edu",
      "biffsucks@hillvalley.edu",
    ]);
    expect(response.body.contact.phoneNumbers).toEqual(["919191", "717171"]);
    expect(response.body.contact.secondaryContactIds).toContain(newerPrimaryId);

    const convertedPrimary = contactRepository.findById(newerPrimaryId);

    expect(convertedPrimary).not.toBeNull();
    expect(convertedPrimary?.linkedId).toBe(oldestPrimaryId);
    expect(convertedPrimary?.linkPrecedence).toBe(LINK_PRECEDENCE.SECONDARY);
  });
});
